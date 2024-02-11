const app = Vue.createApp({
    data() {
        return {
            weatherData: null,
            loading: false,
            error: null,
            openCageApiKey: '6eb6c06075c34a199bbcb67b29e33801',
            openCageApiUrl: 'https://api.opencagedata.com/geocode/v1/json',
            openWeatherApiKey: '52369564d2dc66c1fe013c20a839a624',
            openWeatherApiUrl: 'https://api.openweathermap.org/data/2.5/weather',
            mapBoxApiKey: 'pk.eyJ1IjoiYW50aG9ubHVsIiwiYSI6ImNscXQ1bTBhZzQ3NHAydW1rMnBpcXVqYXYifQ.MNj2_esKLSXToDiEGK3byw',
            cities: [],
            citySuggestions: [],
            searchedCity: '',
            showWeeklyForecast: false,
            unit: 'metric',
            expandedDays: [],
            morningTemperature: null,
            afternoonTemperature: null,
            nightTemperature: null,
            hourlyForecast: [],
            fetchCounter: 0,
            showUnitMenu: false,
        };
    },
    methods: { 
        
        //#region Setting up API
        buildWeatherApiUrl(city) {
            const { name, countryCode } = city;
            return `${this.openWeatherApiUrl}?q=${name},${countryCode}&units=metric&appid=${this.openWeatherApiKey}`;
        },
        buildWeeklyForecastUrl() {
            const { name, countryCode } = this.weatherData;
            return `https://api.openweathermap.org/data/2.5/forecast?q=${name},${countryCode}&units=metric&appid=${this.openWeatherApiKey}`;
        },
        buildDailyForecastApiUrl(city) {
            const { name, countryCode } = city;
            return `https://api.openweathermap.org/data/2.5/forecast?q=${name},${countryCode}&units=metric&appid=${this.openWeatherApiKey}`;
        },
        //#endregion
        
        //#region Fetching Weather information
        async fetchWeatherData(city) {
            try {
                const response = await axios.get(this.buildWeatherApiUrl(city));
                
                city.weatherData = response.data;
            } catch (error) {
                // Handle error
                console.error('Error fetching weather data:', error);
            } finally {
                // Set loading to false or perform other cleanup tasks
                this.loading = false;        
            }
        }, 
        async getCurrentLocationWeather() {
            this.loading = true;
            this.error = null;
        
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 10000,
                    });
                });
        
                const { latitude, longitude } = position.coords;
        
                // Use OpenCage Geocoding to get the location details
                const openCageResponse = await axios.get(
                    `${this.openCageApiUrl}?q=${latitude}+${longitude}&key=${this.openCageApiKey}`
                );
        
                console.log('OpenCage Geocoding Response:', openCageResponse.data);
        
                const locationDetails = openCageResponse.data.results[0];
        
                if (locationDetails && locationDetails.components) {
                    // Check if city is available in the response
                    const city =
                        locationDetails.components.city ||
                        locationDetails.components.town;
        
                    if (city) {
                        // Fetch weather data using the obtained location details
                        const weatherResponse = await axios.get(
                            `${this.openWeatherApiUrl}?lat=${latitude}&lon=${longitude}&units=metric&appid=${this.openWeatherApiKey}`
                        );
        
                        // Update weather data with additional information
                        this.weatherData = {
                            name: city,
                            main: weatherResponse.data.main,
                            weather: weatherResponse.data.weather,
                            components: locationDetails.components, 
                            wind: weatherResponse.data.wind,
                            visibility: weatherResponse.data.visibility, 
                            clouds: weatherResponse.data.clouds, 
                            currentTemperature: weatherResponse.data.main.temp,
                        };

                    // Change background for the searched city
                    this.changeBackground(this.weatherData);
                    } else {
                        this.error = 'City information not found in the geocoding response.';
                    }
                } else {
                    this.error = 'Invalid geocoding response format.';
                }
            } catch (error) {
                // Handle geolocation error
                console.error('Error fetching geolocation data:', error);
                this.error = 'Error fetching geolocation data.';
            } finally {
                this.loading = false;
            }
        }, 
        async fetchDailyForecast(city) {
            try {
                const response = await axios.get(this.buildDailyForecastApiUrl(city));
                this.dailyForecast = response.data;
        
                // Log the entire dailyForecast object to inspect its structure
                console.log('Daily Forecast API Response:', this.dailyForecast);
        
                // Update morning, afternoon, and night temperatures
                if (this.dailyForecast.list.length >= 3) {
                    // Ensure the structure of the data and adjust the property names accordingly
                    this.morningTemperature = this.roundTemperature(this.dailyForecast.list[0]?.main?.temp);
                    this.afternoonTemperature = this.roundTemperature(this.dailyForecast.list[1]?.main?.temp);
                    this.nightTemperature = this.roundTemperature(this.dailyForecast.list[2]?.main?.temp);
        
                    // Log the temperature values to check if they are assigned correctly
                    console.log('Morning Temperature:', this.morningTemperature);
                    console.log('Afternoon Temperature:', this.afternoonTemperature);
                    console.log('Night Temperature:', this.nightTemperature);
                }
            } catch (error) {
                console.error('Error fetching daily forecast data:', error);
                this.error = 'Error fetching daily forecast data.';
            } finally {
                this.loading = false;
            }
        },
        async fetchWeeklyForecast() {
            try {
                const response = await axios.get(this.buildWeeklyForecastUrl());
                this.weatherData.weeklyWeatherData = this.processWeeklyWeatherData(response.data);
                console.log('Weekly Forecast API Response:', response.data);
                console.log('Processed Weekly Weather Data:', this.weatherData.weeklyWeatherData);
            } catch (error) {
                console.error('Error fetching weekly forecast:', error);
                this.error = 'Error fetching weekly forecast. Please try again later.';
            }
        },
        processWeeklyWeatherData(apiResponse) {
            // Extract the list of forecasts from the API response
            const forecastList = apiResponse.list;
        
            // Create an object to store the processed data
            const processedData = {};
        
            // Group the forecasts by day
            forecastList.forEach((forecast) => {
                // Extract the date from the forecast timestamp
                const date = new Date(forecast.dt * 1000);
                
                // Format the date as a string in the 'YYYY-MM-DD' format
                const formattedDate = date.toISOString().split('T')[0];
        
                // If the date is not already a key in processedData, create an array for it
                if (!processedData[formattedDate]) {
                    processedData[formattedDate] = [];
                }
        
                // Add the relevant forecast information to the array for the date
                processedData[formattedDate].push({
                    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temperature: Math.round(forecast.main.temp),
                    high: Math.round(forecast.main.temp_max),
                    low: Math.round(forecast.main.temp_min),
                    humidity: forecast.main.humidity,
                    windSpeed: forecast.wind.speed,
                    windDirection: forecast.wind.deg, // Add wind direction if available
                    description: forecast.weather[0].description,
                });
            });
        
            return processedData;
        },
        async searchWeather(event) {
            // Check if the pressed key is Enter (key code 13)
            if (event.keyCode === 13 || event.type === 'click') {
                event.preventDefault();
        
                if (!this.searchedCity) {
                    return;
                }
        
                this.loading = true;
                this.error = null;
        
                try {
                    const response = await axios.get(this.buildWeatherApiUrl({
                        name: this.searchedCity
                    }));
        
                    console.log('Search Weather API Response:', response.data);
        
                    let newWeatherData;
        
                    if (response.data.list) {
                        // Response for weekly forecast
                        newWeatherData = {
                            name: response.data.city.name,
                            weeklyWeatherData: this.processWeeklyWeatherData(response.data),
                            components: response.data.city,  
                        };
                    } else if (response.data.name) {
                        // Response for current weather or daily forecast
                        newWeatherData = response.data;
                    } else {
                        // Handle the case when the structure of the response is unexpected
                        throw new Error('Unexpected API response structure');
                    }
        
                    // Ensure that this is done after the response is processed
                    this.weatherData = newWeatherData;
                    this.showWeeklyForecast = !!newWeatherData.weeklyWeatherData;
        
                    // Change background for the searched city
                    this.changeBackground(this.weatherData);

                    // Log the extracted region, country, and city
                    if (this.weatherData.components) {
                        console.log('Region:', this.weatherData.components.state || this.weatherData.components.province || '');
                        console.log('Country:', this.weatherData.sys.country);
                        console.log('City:', this.weatherData.name);
                    }
        
                    // Add this line to update the city information for daily forecast
                    this.weatherData.name = newWeatherData.name;
                } catch (error) {
                    console.error('Error fetching weather data:', error);
                    this.error = 'Error fetching weather data.';
                } finally {
                    this.loading = false;
                }
            }
            
        },         
        //#endregion
        
        //#region Switching between forecasts
        async switchToDailyForecast() {
            try {
                this.loading = true;
                this.error = null;
        
                // Check if weatherData is available
                if (this.weatherData) {
                    // Log the contents of weatherData for debugging
                    console.log('Weather Data:', this.weatherData);
        
                    // Check if components is available directly in weatherData
                    if (this.weatherData.components) {
                        // Log the contents of components for debugging
                        console.log('Components:', this.weatherData.components);
        
                        // Fetch daily forecast data for the current location
                        await this.fetchDailyForecast({
                            name: this.weatherData.name,
                            countryCode: this.weatherData.components.country_code || '',
                        });
                    } else if (this.weatherData.sys && this.weatherData.sys.country) {
                        // Handle the case where components is not available directly, but sys.country is present
                        await this.fetchDailyForecast({
                            name: this.weatherData.name,
                            countryCode: this.weatherData.sys.country,
                        });
                    } else {
                        // Log an error message for debugging
                        console.error('Cannot switch to daily forecast: components or sys.country is missing in weatherData.');
                        throw new Error('Cannot switch to daily forecast: components or sys.country is missing in weatherData.');
                    }
                } else {
                    // Log an error message for debugging
                    console.error('Cannot switch to daily forecast: Weather data is missing.');
                    throw new Error('Cannot switch to daily forecast: Weather data is missing.');
                }
        
                this.showWeeklyForecast = false;
            } catch (error) {
                console.error('Error switching to daily forecast:', error);
                this.error = 'Error switching to daily forecast.';
            } finally {
                this.loading = false;
            }
        },
        switchToWeeklyForecast() {
            if (this.weatherData && this.weatherData.name) {
                this.showWeeklyForecast = true;
                this.fetchWeeklyForecast();
            } else {
                console.error('Error switching to weekly forecast: Weather data or name is not available.');
            }
        },
        toggleDayExpansion(date) {
            // Toggle the expansion state for the clicked day
            if (this.expandedDays.includes(date)) {
                this.expandedDays = this.expandedDays.filter(day => day !== date);
            } else {
                this.expandedDays.push(date);
            }
        }, 
        //#endregion
        
        //#region Unit Handling

        // Function to convert temperature based on the selected unit
        convertTemperature(temperature) {
            if (this.unit === 'imperial') {
                // Convert Celsius to Fahrenheit
                (temperature * 9) / 5 + 32;
        }
            // Convert Fahrenheit to Celsius
            return ((temperature - 32) * 5) / 9;
        },
        // Function to round temperature to whole number
        roundTemperature(temperature) {
            return Math.round(temperature);
        },
        // Function to toggle between Celsius and Fahrenheit
        toggleUnit(newUnit) {
            if (this.unit !== newUnit) {
                this.unit = newUnit;
        
                // Convert and update morning, afternoon, and night temperatures if they are available
                if (this.morningTemperature !== null) {
                    this.morningTemperature = this.roundTemperature(this.convertTemperature(this.morningTemperature));
                }
        
                if (this.afternoonTemperature !== null) {
                    this.afternoonTemperature = this.roundTemperature(this.convertTemperature(this.afternoonTemperature));
                }
        
                if (this.nightTemperature !== null) {
                    this.nightTemperature = this.roundTemperature(this.convertTemperature(this.nightTemperature));
                }
        
                // Update the temperature in the existing weatherData
                if (this.weatherData && this.weatherData.main) {
                    this.weatherData.main.temp = this.roundTemperature(this.convertTemperature(this.weatherData.main.temp));
                    this.weatherData.main.temp_max = this.roundTemperature(this.convertTemperature(this.weatherData.main.temp_max));
                    this.weatherData.main.temp_min = this.roundTemperature(this.convertTemperature(this.weatherData.main.temp_min));
                }
        
                // If you have weekly weather data, convert temperatures in it too
                if (this.weatherData && this.weatherData.weeklyWeatherData) {
                    for (const date in this.weatherData.weeklyWeatherData) {
                        if (this.weatherData.weeklyWeatherData.hasOwnProperty(date)) {
                            this.weatherData.weeklyWeatherData[date].forEach((forecast) => {
                                forecast.temperature = this.roundTemperature(this.convertTemperature(forecast.temperature));
                            });
                        }
                    }
                }
            }
        },
        toggleUnitMenu() {
            this.showUnitMenu = !this.showUnitMenu;
        },
        //#endregion
        
        //#region Formatting
        formatDay(dateString) {
            const date = new Date(dateString);
            const options = { weekday: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        },
        formatHourlyForecast(hour) {
            console.log('Hourly Forecast:', hour);
            const date = new Date(hour.dt * 1000);
            const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const temperature = Math.round(hour.temp);
    
            return `${time}: ${temperature}°C, ${hour.weather[0].description}`;
        },
        getFullLocation() {
            if (!this.weatherData) {
                console.error('No weather data available.');
                return '';
            }
        
            const { name, components, sys } = this.weatherData;
        
            console.log('Weather Data:', this.weatherData);
            console.log('Components:', components);
            console.log('Sys:', sys);
        
            if (components) {
                // Extract components for more detailed location information
                const city = components.city || components.town || '';
                const region = components.state || components.province || sys?.region || ''; // Use optional chaining
                const country = components.country || sys?.country || ''; // Use optional chaining
        
                // Build the full location string
                const fullLocation = [city, region, country].filter(Boolean).join(', ');
        
                console.log('Full location:', fullLocation);
        
                return fullLocation;
            } else if (sys && sys.country) {
                // Handle the case where components is not available directly, but sys.country is present
                const country = sys.country || '';
        
                // Build the full location string
                const fullLocation = [name, country].filter(Boolean).join(', ');
        
                console.log('Full location:', fullLocation);
        
                return fullLocation;
            } else if (name) {
                // If the response structure is for the current weather or daily forecast
                return name;
            } else {
                console.error('No components property or name in weatherData.');
                return '';
            }
        },            
        //#endregion
        
        //#region Design
        changeBackground(weatherData) {
            // Check if it's the daily forecast
            if (!this.showWeeklyForecast) {
                document.body.classList.remove('weekly-forecast-background');
                const body = document.querySelector('.bg-image');
        
                // Map weather descriptions to corresponding background images
                const backgroundMappings = {
                    'Clear': 'url("https://mdbgo.io/ascensus/mdb-advanced/img/clear.gif")',
                    'Clouds': 'url("https://mdbgo.io/ascensus/mdb-advanced/img/clouds.gif")',
                    'Rain': 'url("https://mdbgo.io/ascensus/mdb-advanced/img/rain.gif")',
                    'Thunderstorm': 'url("https://mdbgo.io/ascensus/mdb-advanced/img/thunderstorm.gif")',
                    'Snow': 'url("https://mdbgo.io/ascensus/mdb-advanced/img/snow.gif")',
                    'Mist': 'url("https://example.com/mist-background.jpg")',
                };
        
                // Get the background image URL based on the weather description
                const mainWeather = weatherData.weather[0].main;
                const backgroundImage = backgroundMappings[mainWeather] || '';
        
                // Set the background image of the body
                body.style.backgroundImage = backgroundImage;
            } else {
                // Remove background image and add class for styling
                const body = document.querySelector('.bg-image');
                body.style.backgroundImage = 'none';
                document.body.classList.add('weekly-forecast-background');
            }        
            },
        //#endregion
        
        groupForecastByDay(forecastList) {
            const groupedForecast = {};
        
            forecastList.forEach((forecast) => {
                const date = new Date(forecast.dt * 1000);
                const day = date.toISOString().split('T')[0];
        
                if (!groupedForecast[day]) {
                    groupedForecast[day] = [];
                }
        
                // Adjust the structure to include the necessary forecast information
                groupedForecast[day].push({
                    dt: forecast.dt,
                    main: forecast.main,
                    weather: forecast.weather,
                });
            });
        
            return groupedForecast;
        },        

        getCurrentTime() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');

            return `${hours}:${minutes}`;
        },
        getRainValue() {
            // Check if weatherData and rain object exist
            if (this.weatherData && this.weatherData.rain) {
              // Check if the desired property exists in the rain object
              if ('1h' in this.weatherData.rain) {
                // Return the value of the property
                return this.weatherData.rain['1h'];
              }
            }
            // Return a default value if the property doesn't exist
            return 'N/A';
          }
    },
    async mounted() {
        try {
            // Automatically fetch weather for the user's current location
            await this.getCurrentLocationWeather();
    
            
            // Fetch the daily forecast data for the current location
            await this.fetchDailyForecast({
                name: this.weatherData.name,
                countryCode: this.weatherData.components.country_code,
            });
    
            // Fetch the list of cities from OpenWeatherMap without using geolocation
            const citiesResponse = await axios.get(
                `https://api.openweathermap.org/data/2.5/find?lat=0&lon=0&cnt=10&appid=${this.openWeatherApiKey}`
            );
    
            // Update the cities array with the list of cities from the API response
            this.cities = citiesResponse.data.list;
    
            // Fetch weather data for each city
            for (const city of this.cities) {
                await this.fetchWeatherData(city);
            }


        } catch (error) {
            console.error('Error fetching data:', error);
            this.error = 'Error fetching data.';
            this.loading = false;
        }
    },
    
});

app.mount('#app');