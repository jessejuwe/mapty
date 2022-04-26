'use strict';

class Workout {
  date = new Date();

  // using the last 10 numbers of a date object as the id. not as ideal in the real world
  id = (Date.now() + '').slice(-10);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [latitude, longitude]
    this.distance = distance; // in kms
    this.duration = duration; // in mins
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  //   console.log(this.clicks);
  //   return this.clicks;
  // }
}

// child class of Workout {}
class Running extends Workout {
  // type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.type = 'running';
    this.cadence = cadence;

    // calling functions in the constructor
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // defined in mins/km (UK)
    // defined in miles/km (US)
    this.pace = this.duration / this.distance;
    return this;
  }
}

// child class of workout {}
class Cycling extends Workout {
  // type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.type = 'cycling';
    this.elevationGain = elevationGain;

    // calling functions in the constructor
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // defined in km/h
    this.speed = this.distance / this.duration;
    return this;
  }
}
// const run1 = new Running([23, -17], 100, 120, 2);
// console.log(run1);
/////////////////////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // Private instance properties
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // Get users position
    this._getPosition();

    // Get data from local storage
    this._getFromLocalStorage();

    // Adding an Event Listener to the form
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Adding an Event Listener to the input type
    // adding .bind(this) is not necessary. the function does not use the this keyword in itself
    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    // Adding an Event Listener to the container (workout)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Private methods
  // class function for getting current position of the user
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert(`Could not get your position`);
      });
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // Setting a default Map Style
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Render markers on map once app loads
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // Remove the hidden class from the form
    form.classList.remove('hidden');
    // focus on the Distance input form field
    inputDistance.focus();
  }

  _hideForm() {
    // prettier-ignore
    // Clear fields
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';

    // Hide the form and add the hidden class to the from
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField(e) {
    e.preventDefault();
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];

    let workout, className;

    // Helper function for form validation (only numbers)
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    // Helper function for form validation (positive numbers)
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // className = 'running-popup';

      // Check if data is valid
      // Guard clause (chexking for the oposite of the actual condition)
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(`One or more of the inputs is not a positive number!`);

      // Create new running object
      workout = new Running(coords, distance, duration, cadence);
    }

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // className = 'cycling-popup';

      // Check if data is valid
      // Guard clause (chexking for the oposite of the actual condition)
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(`One or more of the inputs is not a positive number!`);

      // Create new running object
      workout = new Cycling(coords, distance, duration, elevation);
    }

    // Add new object to the workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkoutList(workout);

    // Hide form and Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    // `Latitude: ${workout.coords[0].toFixed(4)} <br> Longitude: ${workout.coords[1].toFixed(4)}`
  }

  _renderWorkoutList(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        } </span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div> 
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEL = e.target.closest('.workout');

    // Guard clause
    if (!workoutEL) return;

    // prettier-ignore
    const workout = this.#workouts.find(work => work.id === workoutEL.dataset.id);

    // Set view of map to target element
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // Using the public Interface
    // workout.click();
  }

  _setLocalStorage() {
    // JSON.stringify() converts objects to strings
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getFromLocalStorage() {
    // Objects coming from local storage will not inherit all the methods they had before
    const data = JSON.parse(localStorage.getItem('workouts'));

    // Guard Clause
    if (!data) return;

    // If Guard Clause returns true
    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkoutList(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
