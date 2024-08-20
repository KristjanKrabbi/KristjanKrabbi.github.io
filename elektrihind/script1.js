
/*         async function fetchElectricityPrices() {
            const now = new Date();
            const start = now.toISOString();
            const end = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 tund hiljem

            const API_URL = `https://dashboard.elering.ee/api/nps/price?start=${start}&end=${end}`;
            // const API_URL = "https://dashboard.elering.ee/api/nps/price/EE/current";
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                console .log (start)
         
console .log (data)
                if (data.success) {
                    const priceData = data.data.ee;

                    const currentHourTimestamp = Math.floor(now.getTime() / 1000);
                    const nextHourTimestamp = currentHourTimestamp + 3600;

                    // let currentPrice = priceData.price;
                    let currentPrice = 0;

                    let nextHourPrice = 0;

                    priceData.forEach(hourData => {
                        const timestamp = hourData.timestamp;

                        if (timestamp === currentHourTimestamp) {
                            currentPrice = hourData.price;
                        }
                        if (timestamp === nextHourTimestamp) {
                            nextHourPrice = hourData.price;
                        }
                    });

                    document.getElementById('currentPrice').textContent = currentPrice.toFixed(2);
                    document.getElementById('nextHourPrice').textContent = nextHourPrice.toFixed(2);
                } else {
                    console.error('API vastus ei olnud edukas');
                }
            } catch (error) {
                console.error('Päringu viga:', error);
            }
        }

        fetchElectricityPrices();
        setInterval(fetchElectricityPrices, 3600000); // Uuendab hinda iga 60 minuti tagant */
        async function fetchElectricityPrices() {
            const now = new Date();
            const currentHour = new Date(now.setMinutes(0, 0, 0)); // Sea praegune tund täpselt tunni algusesse
            const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000); // Järgmine tund
        const latest_URL = 'https://dashboard.elering.ee/api/nps/price/EE/latest'

        console.log((currentHour).toLocaleTimeString("en-GB", {  hour: '2-digit', minute: '2-digit' }))
        try {
            const response = await fetch(latest_URL);
            const data = await response.json();
            
            if (data.success) {
                // const priceData = data.data;
                var periodEndHour=  new Date((data.data[0].timestamp)*1000);
                console .log(data.data[0].timestamp);
                console .log(periodEndHour.toISOString());
    console.log(new Date(currentHour.getTime() + 60 * 60 * 1000*24))
               
            } else {
                periodEndHour = new Date(currentHour.getTime() + 60 * 60 * 1000*24); // Viimane tund

                console.error('API vastus ei olnud edukas');
            }
        } catch (error) {
            console.error('Päringu viga:', error);
        }

            const API_URL = `https://dashboard.elering.ee/api/nps/price?start=${currentHour.toISOString()}&end=${periodEndHour.toISOString()}`;
            console .log (currentHour)
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
        
                if (data.success) {
                    const priceData = data.data.ee;
        
                    let currentPrice = 0;
                    let nextHourPrice = 0;
        
                    priceData.forEach(hourData => {
                        const timestamp = hourData.timestamp;
        switch (timestamp) {
            case Math.floor(currentHour.getTime() / 1000):
                
            currentPrice = (hourData.price)*0.122;
            break;
        case Math.floor(nextHour.getTime() / 1000):
            nextHourPrice = hourData.price*0.122;
            break;
            default:
                let time =new Date(((hourData.timestamp))*1000)
                            document.body.innerHTML += "<p>" +time.toLocaleTimeString("en-GB", {  hour: '2-digit', minute: '2-digit' })+' - '+((hourData.price)*0.122).toFixed(2)+"</p>";
                break;
        } 
        
                      /*   if (timestamp === Math.floor(currentHour.getTime() / 1000)) {
                            currentPrice = (hourData.price)*0.122;
                        }
                        if (timestamp === Math.floor(nextHour.getTime() / 1000)) {
                            nextHourPrice = hourData.price*0.122;
                        }
                        let time =new Date(((hourData.timestamp)+3*3600)*1000)
                            document.body.innerHTML += "<p>" +time.toISOString()+' '+(hourData.price)*0.122+"</p>"; */
                        
                    });
        
                    document.getElementById('currentPrice').textContent = currentPrice.toFixed(2);
                    document.getElementById('nextHourPrice').textContent = nextHourPrice.toFixed(2);
                } else {
                    console.error('API vastus ei olnud edukas');
                }
            } catch (error) {
                console.error('Päringu viga:', error);
            }
        }
var currentTime= Date.now()
        console. log( (currentTime))
        fetchElectricityPrices();
        setInterval(fetchElectricityPrices, 3600000); // Uuendab hinda iga 60 minuti tagant
