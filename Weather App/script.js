let currentUnit = "C";
let weatherData = null;

function getWeatherInfo(code, isDay = 1){
    if(code === 0){ return { text: "Clear Sky", icon: isDay ? "☀️" : "🌙" }; }
    if(code === 1){ return { text: "Mainly Clear", icon: isDay ? "🌤️" : "🌙" }; }
    if(code === 2){ return { text: "Partly Cloudy", icon: "⛅" }; }
    if(code === 3){ return { text: "Overcast", icon: "☁️" }; }
    if([45,48].includes(code)){ return { text: "Foggy", icon: "🌫️" }; }
    if([51,53,55].includes(code)){ return { text: "Drizzle", icon: "🌦️" }; }
    if([56,57].includes(code)){ return { text: "Freezing Drizzle", icon: "🌧️" }; }
    if([61,63,65].includes(code)){ return { text: "Rain", icon: "🌧️" }; }
    if([66,67].includes(code)){ return { text: "Freezing Rain", icon: "🌧️" }; }
    if([71,73,75,77].includes(code)){ return { text: "Snow", icon: "❄️" }; }
    if([80,81,82].includes(code)){ return { text: "Rain Showers", icon: "🌦️️" }; }
    if([85,86].includes(code)){ return { text: "Snow Showers", icon: "🌨️" }; }
    if([95].includes(code)){ return { text: "Thunderstorm", icon: "⛈️" }; }
    if([96,99].includes(code)){ return { text: "Thunderstorm + Hail", icon: "⛈️" }; }
    return { text: "Unknown", icon: "🌡" };
}

async function searchWeather(){
    const input = document.getElementById("cityInput");
    const city = input.value.trim();
    if(!city){
        showError("Please enter a city name.");
        return;
    }
    hideError();
    showLoading(true);
    try{
        const geoURL = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoURL);
        if(!geoResponse.ok){ throw new Error("Unable to search for this city."); }
        const geoData = await geoResponse.json();
        if(!geoData.results || geoData.results.length === 0){
            throw new Error("City not found. Try another city.");
        }
        const location = geoData.results[0];
        await getWeather(location.latitude, location.longitude, location.name, location.country);
    }catch(error){
        console.error(error);
        showError(error.message || "Something went wrong.");
    }finally{
        showLoading(false);
    }
}

async function getWeather(latitude, longitude, city, country){
    const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&forecast_days=5` +
        `&temperature_unit=celsius` +
        `&wind_speed_unit=kmh` +
        `&timezone=auto`;
    const response = await fetch(weatherURL);
    if(!response.ok){ throw new Error("Weather service is unavailable."); }
    weatherData = await response.json();
    weatherData.location = { city: city, country: country };
    displayWeather();
}

function displayWeather(){
    if(!weatherData){ return; }
    const current = weatherData.current;
    const location = weatherData.location;

    document.getElementById("cityName").textContent = location.city;
    document.getElementById("countryName").textContent = location.country;
    const info = getWeatherInfo(current.weather_code, current.is_day);
    document.getElementById("weatherIcon").textContent = info.icon;
    document.getElementById("condition").textContent = info.text;
    updateTemperatures();
    document.getElementById("humidity").textContent = Math.round(current.relative_humidity_2m) + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m);
    displayForecast();
    updateBackground(current.weather_code, current.is_day);
}

function convertTemperature(celsius){
    if(currentUnit === "F"){ return (celsius * 9/5) + 32; }
    return celsius;
}

function updateTemperatures(){
    const current = weatherData.current;
    const temp = convertTemperature(current.temperature_2m);
    const feels = convertTemperature(current.apparent_temperature);
    document.getElementById("temperature").textContent = Math.round(temp);
    document.getElementById("feelsLike").textContent = Math.round(feels);
    document.getElementById("apparent").textContent = Math.round(feels) + "°";
    document.getElementById("unit").textContent = currentUnit;
}

function changeUnit(unit){
    currentUnit = unit;
    document.getElementById("celsiusBtn").classList.toggle("active", unit === "C");
    document.getElementById("fahrenheitBtn").classList.toggle("active", unit === "F");
    updateTemperatures();
    displayForecast();
}

function displayForecast(){
    const forecast = document.getElementById("forecast");
    forecast.innerHTML = "";
    const daily = weatherData.daily;

    for(let i = 0; i < daily.time.length; i++){
        const date = new Date(daily.time[i] + "T12:00:00");
        const dayName = date.toLocaleDateString("en-US", { weekday:"short" });
        const info = getWeatherInfo(daily.weather_code[i], 1);
        const maxTemp = Math.round(convertTemperature(daily.temperature_2m_max[i]));
        const minTemp = Math.round(convertTemperature(daily.temperature_2m_min[i]));
        const card = document.createElement("div");
        card.className = "day";
        card.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-icon">${info.icon}</div>
            <div class="day-temp">${maxTemp}° / ${minTemp}°</div>
            <div class="day-condition">${info.text}</div>
        `;
        forecast.appendChild(card);
    }
}

function updateBackground(code, isDay){
    document.body.className = "";
    if(isDay === 0){ document.body.classList.add("night"); return; }
    if(code === 0 || code === 1){ document.body.classList.add("sunny"); return; }
    if(code === 2 || code === 3 || code === 45 || code === 48){
        document.body.classList.add("cloudy"); return; }
    if((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code === 95){
        document.body.classList.add("rainy"); return; }
    if((code >= 71 && code <= 77) || code === 85 || code === 86){
        document.body.classList.add("snowy"); return; }
}

function showLoading(show){
    document.getElementById("loading").style.display = show ? "block" : "none";
}

function showError(message){
    const error = document.getElementById("error");
    error.textContent = message;
    error.style.display = "block";
}

function hideError(){
    document.getElementById("error").style.display = "none";
}

document.getElementById("cityInput").addEventListener("keydown", function(event){
    if(event.key === "Enter"){ searchWeather(); }
});

// Default City on Load
document.getElementById("cityInput").value = "Addis Ababa";
searchWeather();