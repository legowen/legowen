// A small browser-only slice of Owen's original weather dashboard.
export function mountWeather(root) {
  const cities = {
    'Port Moody': { temp: [13, 15, 12, 14, 16], humidity: 73, wind: 3.4, condition: 'Light rain', icon: '🌦' },
    Vancouver: { temp: [14, 16, 13, 15, 17], humidity: 68, wind: 4.2, condition: 'Partly cloudy', icon: '⛅' },
    Seoul: { temp: [21, 23, 20, 19, 22], humidity: 52, wind: 2.1, condition: 'Clear skies', icon: '☀' },
    London: { temp: [12, 14, 11, 13, 15], humidity: 78, wind: 5.3, condition: 'Cloudy', icon: '☁' }
  };
  let city = 'Port Moody', day = 0, fahrenheit = false;
  root.innerHTML = `<section class="weather-slice" aria-label="Hope no Rain weather dashboard"><header><h3>Weather Dashboard</h3><span>INTERACTIVE SAMPLE</span></header><div class="weather-current"><div><h4></h4><p></p></div><span aria-hidden="true" class="weather-icon"></span></div><div class="weather-toolbar"><label>Explore a city <select aria-label="Weather city">${Object.keys(cities).map(c=>`<option>${c}</option>`).join('')}</select></label><button type="button" aria-pressed="false">Switch to °F</button></div><div class="weather-stats"><div><span>Temperature</span><strong data-stat="temp"></strong><small>Sample daily high</small></div><div><span>Humidity</span><strong data-stat="humidity"></strong><small>Sample conditions</small></div><div><span>Wind speed</span><strong data-stat="wind"></strong><small>Sample conditions</small></div></div><h4>Five-day outlook</h4><div class="weather-days" aria-label="Sample forecast days"></div><p class="slice-note">Explore the original dashboard layout with sample data. This is not a live forecast.</p></section>`;
  const app = root.firstElementChild, unitButton = app.querySelector('button');
  const format = n => `${fahrenheit ? Math.round(n * 9 / 5 + 32) : n}°${fahrenheit ? 'F' : 'C'}`;
  function render() {
    const data = cities[city];
    app.querySelector('.weather-current h4').textContent = `${city} · Day ${day + 1}`;
    app.querySelector('.weather-current p').textContent = `${format(data.temp[day])} · ${data.condition}`;
    app.querySelector('.weather-icon').textContent = data.icon;
    app.querySelector('[data-stat="temp"]').textContent = format(data.temp[day]);
    app.querySelector('[data-stat="humidity"]').textContent = `${data.humidity}%`;
    app.querySelector('[data-stat="wind"]').textContent = `${data.wind} m/s`;
    app.querySelector('.weather-days').innerHTML = data.temp.map((t,i)=>`<button type="button" data-day="${i}" aria-pressed="${day===i}"><span>Day ${i+1}</span><b>${format(t)}</b><span aria-hidden="true">${i%2 ? '⛅' : data.icon}</span></button>`).join('');
    unitButton.textContent = fahrenheit ? 'Switch to °C' : 'Switch to °F';
    unitButton.setAttribute('aria-pressed', String(fahrenheit));
  }
  app.querySelector('select').addEventListener('change', e => { city = e.target.value; render(); });
  unitButton.addEventListener('click', () => { fahrenheit = !fahrenheit; render(); });
  app.querySelector('.weather-days').addEventListener('click', e => { const b=e.target.closest('[data-day]'); if(b){day=Number(b.dataset.day);render();} });
  render();
  return () => root.replaceChildren();
}
