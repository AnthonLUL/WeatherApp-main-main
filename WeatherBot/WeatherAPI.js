const axios = require('axios');
const { api_token } = require('./config.json'); // Use api_token from config.json

async function getCurrentWeather(city) {
    try {
        const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_token}`);
        
        // Convert temperature from Kelvin to Celsius and round to the nearest whole number
        const temperatureCelsius = Math.round(response.data.main.temp - 273.15);

        response.data.main.temp = temperatureCelsius;

        return response.data;
    } catch (error) {
        throw error;
    }
}

async function getWeatherForecast(city) {
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${api_token}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

function analyzeForecast(forecast) {
    const dailyForecasts = {};

    forecast.list.forEach(entry => {
        const date = entry.dt_txt.split(' ')[0];
        const hour = entry.dt_txt.split(' ')[1].split(':')[0];
        const tempCelsius = Math.round(entry.main.temp - 273.15); // Convert from Kelvin to Celsius

        if (!dailyForecasts[date]) {
            dailyForecasts[date] = [];
        }

        dailyForecasts[date].push({
            date: new Date(entry.dt_txt),
            hour: hour,
            condition: entry.weather[0].description,
            temp: tempCelsius
        });
    });

    const worstTimes = Object.entries(dailyForecasts).map(([date, times]) => {
        const worstTime = times.reduce((worst, time) => {
            // Check if the current time has lower temperature or worse conditions
            if (!worst || time.temp < worst.temp || isWorseCondition(time.condition, worst.condition)) {
                return time;
            }
            return worst;
        }, null);
        return worstTime;
    });

    console.log('Worst Times:', worstTimes); // Log the worstTimes array
    return worstTimes;
}

function isWorseCondition(currentCondition, previousCondition) {
    // Define a scale of conditions (you may need to adjust this based on your requirements)
    const conditionScale = {
        'Thunderstorm': 5,
        'Drizzle': 4,
        'Rain': 3,
        'Snow': 2,
        'Mist': 1,
    };

    // Check if the current condition is worse than the previous one based on the scale
    return conditionScale[currentCondition] > conditionScale[previousCondition];
}

function formatForecastDetails(forecasts) {
    return forecasts.map(time => {
        if (!time.date) {
            console.error('Invalid forecast data:', time);
            return 'Invalid forecast data';
        }
        const formattedDate = `${padZero(time.date.getDate())}-${padZero(time.date.getMonth() + 1)}-${time.date.getFullYear()}`;
        return `${formattedDate} at ${time.hour}:00 - ${time.condition}, ${time.temp}°C`;
    }).join('\n');
}

function padZero(number) {
    return number.toString().padStart(2, '0');
}

function formatDate(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsOfYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayOfWeek = daysOfWeek[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthOfYear = monthsOfYear[date.getMonth()];

    const suffix = getDaySuffix(dayOfMonth);

    return `${dayOfWeek} the ${dayOfMonth}${suffix} of ${monthOfYear}`;
}

function getDaySuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

module.exports = { 
    getCurrentWeather,
    getWeatherForecast,
    analyzeForecast,
    formatForecastDetails,
    formatDate,
    getDaySuffix
};
