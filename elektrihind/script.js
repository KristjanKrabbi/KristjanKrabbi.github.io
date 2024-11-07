async function fetchElectricityPrices() {
    const now = new Date();
    const start = new Date(now.setMinutes(0, 0, 0));  // Alustame praegusest tunni algusest
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);  // Lõpeta 24 tunni pärast
    // console.log(start.toISOString())
    console.log(end.toISOString())
    const API_URL = `https://dashboard.elering.ee/api/nps/price?start=${start.toISOString()}&end=${end.toISOString()}`;
    //  const API_URL = `https://dashboard.elering.ee/api/nps/price?start=2024-11-07T16%3A00%3A00.000Z&end=2024-11-08T16%3A00%3A00.000Z`  ;
    // const API_URL =`http://localhost:3000/proxy?start=${start.toISOString()}&end=${end.toISOString()}`
    try {
        // console.log(end.toISOString())
        // const response =await fetch(`http://localhost:3000/proxy?start=${start.toISOString()}&end=${end.toISOString()}`);
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.success) {
            const priceData = data.data.ee;

            const labels = [];
            const prices = [];

            priceData.forEach(hourData => {
                const timestamp = hourData.timestamp * 1000;  // Muuda timestamp millisekunditeks
                const date = new Date(timestamp);
                labels.push(date.getHours() + ':00');  // Lisa tunni nimi (nt "13:00")
                prices.push(hourData.price * 0.122).toFixed(2);  // Lisa hind
            });
            document.getElementById('currentPrice').textContent = prices[0].toFixed(2);
            document.getElementById('nextHourPrice').textContent = prices[1].toFixed(2);
            // Joonista graafik
            drawChart(labels, prices);
        } else {
            console.error('API vastus ei olnud edukas');
        }
    } catch (error) {
        console.error('Päringu viga:', error);
    }
}

function drawChart(labels, prices) {
    const minPrice = Math.min(...prices);  // Leia madalaim hind
    const minIndex = prices.indexOf(minPrice);  // Leia madalaima hinna indeks
    const backgroundColors = prices.map((price, index) => {
        return index === minIndex ? 'green' : 'rgba(75, 192, 192, 0.2)';  // Muuda madalaima hinna tulba värv 
    });

    const borderColors = prices.map((price, index) => {
        return index === minIndex ? 'darkgreen' : 'rgba(75, 192, 192, 1)';  // Muuda madalaima hinna tulba äärise värv
    });
    const ctx = document.getElementById('priceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',  // Kasuta joongraafikut 'line'
        data: {
            labels: labels,
            datasets: [{
                display: true,
                label: '',
                align: 'center',
                data: prices,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                backgroundColor: backgroundColors,  // Rakenda kohandatud taustavärvid
                borderColor: borderColors,  // Rakenda kohandatud äärisevärvid
                borderWidth: 2,
                stepped: true,  // Määrab astmelise joonistamise
                pointBackgroundColor: function (context) {
                    return context.dataIndex === minIndex ? 'red' : 'rgba(75, 192, 192, 1)';
                },
                pointRadius: function (context) {
                    return context.dataIndex === minIndex ? 6 : 3;
                },
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tunnid'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hind senti/KWh'
                    }
                }
            },
            plugins: {
                tooltip: {
                    usePointStyle: true,
                    // Eemaldame värvilise ruudu
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            const value = context.raw;
                            return context.dataIndex === minIndex

                                ? `${label} ${value.toFixed(2)} s/KWh (madalaim)`
                                : `${label} ${value.toFixed(2)} s/KWh`;
                            }
                            
                        }
                        
                        
                        

                    }
                    
                    
                    
                }
            }
        });
}



fetchElectricityPrices();  // Lae hinnad ja joonista graafik
