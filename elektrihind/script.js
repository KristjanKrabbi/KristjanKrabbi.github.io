// Import Firebase'i andmebaasi
import { database } from '../krabikuller/firebase.js';
import { ref, push, set, get, update } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
let chart = null; // Globaalse muutuja lisamine
let timestamps = [];
let labels = [];
let prices = [];
let lastHour = new Date().getHours();
let nextLowestTimestamp=null
let selectorState={};
document.addEventListener("DOMContentLoaded", function () {
    let now = new Date();
    let currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000;
    const lastHourRef = ref(database, 'electricityPrices/lastHour');
    let threshold = document.getElementById('priceThreshold').value;
    let tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) / 1000;
    let today = 0
    const stockPriceHour = 14 //the hour from which stock prices are requested
    const stockPriceRelease = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stockPriceHour, 0, 0).getTime() / 1000;

    /**
     * appState
     * @param {string} source-'memory'  'database'  'server'
     * @param {string} lastFetch-timestamp
     */
    const appState = { source: null, lastFetch: null };
     selectorState={day:'refresh',selectedHour:null};
    let lastTimestamp = timestamps.at(-1)?.timestamp
    
    async function fetchElectricityPrices() {
        now= getTimeContext().now;
        const {
            
            currentHour,
            currentDate,
            tomorrowStart,
            tomorrowEnd
        } = getTimeContext();
        
        console.log('fetchElectricityPrices ', now.toLocaleString());

        // 1️⃣ Mälu
        if (canUseMemory(currentTimestamp)) {
            await filterData(currentTimestamp, timestamps);
            appState.source = 'memory';
            drawChart(labels, prices);
            //showDataSource();
            


            if (appState.lastFetch == currentTimestamp ||
                 lastTimestamp  >= tomorrowEnd||
                 currentTimestamp< stockPriceRelease) {
                console.log('andmed mälus piisavad. viimane timestamps: ' + new Date(lastTimestamp * 1000).toLocaleString() + 'lastFetch ' + new Date(appState.lastFetch * 1000).toLocaleString()
                , appState.lastFetch == currentTimestamp, lastTimestamp >= tomorrowEnd,currentTimestamp < stockPriceRelease);
                return;
            }

        }

        // 2️⃣ Andmebaas
        if (ShouldUseDatabase(currentTimestamp, tomorrowStart,currentDate)) {

            await GetDatabasePrices(currentHour, currentDate);
            lastTimestamp = timestamps.at(-1)?.timestamp;
            if (canUseData(currentTimestamp, tomorrowStart, tomorrowEnd, now)) {

                appState.source = 'database';
                appState.lastFetch = currentTimestamp;
                // drawChart(labels, prices);
                //showDataSource();
                return;
            }
        }
        // 3️⃣ Server
        console.log('                       GetStockPrices')
        GetStockPrices(currentHour, currentDate);
        appState.source = 'server';
        //showDataSource();


    }
    
    function canUseMemory(currentTimestamp) {
         lastTimestamp = timestamps.at(-1)?.timestamp;
        return lastTimestamp && lastTimestamp > currentTimestamp;
    }
    async function ShouldUseDatabase(currentTimestamp,tomorrowStart,currentDate) {
        //const lastTimestamp = timestamps.at(-1)?.timestamp;
        if (!lastTimestamp) return true;
        const hasDataUntilTodayMidnight = lastTimestamp >= tomorrowStart;
        const lastFetched=appState.lastFetch ==( currentTimestamp-30*60)
        //if (!lastFetched) return true
         if ( hasDataUntilTodayMidnight) {
             // Hangi viimane salvestatud tund Firebase'ist
                const snapshot = await get(lastHourRef);
                let      lastDate = null
                

                if (snapshot.exists()) {
                   const lastHourData = snapshot.val();
                    //const{ hour: dataLastHour, date: lastDate } = lastHourData;
                     lastDate = lastHourData.date
                    const dataLastHour = lastHourData.hour
                    console.log(lastDate + ' ' + dataLastHour)
                }
                if (lastDate === currentDate) return true
            console.log('andmed kuni südaööni → ÄRA päringut tee')
            return false;
        }
        return true
    }
    function canUseData(currentTimestamp, tomorrowStart, tomorrowEnd, now) {
        //const lastTimestamp = timestamps.at(-1)?.timestamp;
        if (!lastTimestamp) return false;

       // const stockPriceRelease = new Date(now.getFullYear(), now.getMonth(), now.getDate(), stockPriceHour, 0, 0).getTime() / 1000;

        const hasDataUntilTodayMidnight = lastTimestamp >= tomorrowStart;
        const hasDataUntilTomorrowEnd = lastTimestamp >= tomorrowEnd;
        const isBeforeRelease = currentTimestamp < stockPriceRelease;
        const isAfterRelease = currentTimestamp >= stockPriceRelease;

        // Enne avaldamist + andmed kuni südaööni → ÄRA päringut tee
        console.log('if Enne avaldamist ' +isBeforeRelease+ ' andmed kuni südaööni '+hasDataUntilTodayMidnight)
        if (isBeforeRelease && hasDataUntilTodayMidnight) {
            console.log('Enne avaldamist + andmed kuni südaööni → ÄRA päringut tee')
            return true;
        }

        // Pärast avaldamist:
        // kui homsed andmed on juba olemas → kasuta DB-d
        if (isAfterRelease && hasDataUntilTomorrowEnd) {
            console.log('kui homsed andmed on juba olemas → kasuta DB-d')
            return true;
        }
        if (appState.lastFetch == currentTimestamp) {
            console.log('appState.lastFetch == currentTimestamp')
            return true;
        }

        // Muudel juhtudel on vaja serverist küsida
        console.log('Muudel juhtudel on vaja serverist küsida')
        return false;
    }

    async function GetDatabasePrices(currentHour, currentDate) {

        try {
         /*    let lastHourData = null
            let dataLastHour = null
            let lastDate = null
            //if (timestamps.length !== 0) {
                //console.log(timestamps.length)

                // Hangi viimane salvestatud tund Firebase'ist
                const snapshot = await get(lastHourRef);

                if (snapshot.exists()) {
                    lastHourData = snapshot.val();
                    //const{ hour: dataLastHour, date: lastDate } = lastHourData;
                    lastDate = lastHourData.date
                    dataLastHour = lastHourData.hour
                    console.log(lastDate + ' ' + dataLastHour)
                }
            //} else {
                //dataLastHour = currentHour
                //lastDate = currentDate
           // }
            console.log(lastDate + ' ' + dataLastHour) */
            // Kontrollime, kas tund või kuupäev on muutunud
            //if (dataLastHour === currentHour && lastDate === currentDate) {
            console.log(" Laen andmed Firebase'ist...");
            const pricesRef = ref(database, 'electricityPrices/current');
            const priceSnapshot = await get(pricesRef);

            if (priceSnapshot.exists()) {
                const data = priceSnapshot.val();
                console.log('data.length ', data.data.length);
                //const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
                const { todayStart } = getTimeContext();
                timestamps = data.data.filter(item => item.timestamp >= todayStart)
                //JSONCookie(timestamps);
                await filterData(currentTimestamp, data.data);

                lastHour = currentHour; // Uuendame viimase tunni jälgijat
                console.log("Andmed Firebase'ist:", { labels, prices, timestamps });
                drawChart(labels, prices);

            } else {
                console.error("Firebase'ist ei leitud andmeid.");
            }
            //}

        } catch (error) {
            console.error("Viga Firebase'i päringus:", error);
        }
    }

    async function GetStockPrices(currentHour, currentDate) {
        try {
            //console.log('labels.length laen serverist', labels.length)

            const API_URL = "https://us-central1-krabikuller.cloudfunctions.net/fetchElectricityPrices";
            // const API_URL = `https://corsproxy.io/?https://dashboard.elering.ee/api/nps/price`;

            const start = new Date(now.setMinutes(0, 0, 0)).toISOString();
            // Järgmise päeva kuupäeva ja südaöö arvutamine
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
            console.log(tomorrow)
            const end = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(); // Järgmise päeva südaöö
            //const end = new Date(Date.now(now.setMinutes(0, 0, 0)) + 24 * 60 * 60 * 1000).toISOString();
            console.log(`?start=${start} & end=${end}`)
            console.log(`${API_URL}?start=${start}&end=${end}`)
            // console.log("start=" + Date.parse(start) + " & " + (new Date(now.setMinutes(0, 0, 0)).toLocaleString()))
            fetch(`${API_URL}?start=${start}&end=${end}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Viga: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })

                .then(async data => {
                    console.log(data); // Kasutage andmeid vastavalt vajadusele
                    //console.log(data.data.ee.length)
                    // Salvestame andmed Firebase'i
                    await set(lastHourRef, { hour: currentHour, date: currentDate });
                    appState.lastFetch = currentTimestamp;
                    const pricesRef = ref(database, 'electricityPrices/current');
                    //await set(pricesRef, { data: data.data.ee });
                    const snapshot = await get(pricesRef);
                    let combinedData = []
                    let sorteddata
                    if (snapshot.exists()) {
                        // Olemasolevate andmete käsitlus
                        const existingData = snapshot.val();
                        // Veendume, et andmed on massiivid
                        const existingPrices = Array.isArray(existingData.data) ? existingData.data : [];
                        const newPrices = Array.isArray(data.data.ee) ? data.data.ee : [];
                        const cleanedExisting = existingPrices.filter(p => p && typeof p.timestamp !== "undefined");
                       // const yesterday =  new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0).getTime() / 1000,
                        
                     //     sorteddata  = existingData.data.filter(item => item.timestamp >= yesterday);
                        // Kombineerime massiivid ja eemaldame võimalikud duplikaadid
                        combinedData = [...cleanedExisting, ...newPrices].reduce((unique, item) => {
                            if (!unique.some(entry => entry?.timestamp === item?.timestamp)) {
                                unique.push(item);
                            }
                            return unique;
                        }, []);
                        await update(pricesRef, {
                            ...existingData,
                            data: combinedData,
                            end, // Värskenda lõpuaeg
                        });
                        console.log("Olemasolevat kirjet uuendati Firebase'is!");
                    } else {
                        // Uute andmete käsitlus
                        const newData = {
                            start,
                            lastHour,
                            end,
                            data: Array.isArray(data.data.ee) ? data.data.ee : [],
                            timestamp: new Date().toISOString(),
                        };
                        await set(pricesRef, newData);
                        console.log("Uus kirje lisati Firebase'i!");
                    }
                    //const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
                    const { todayStart } = getTimeContext();
                    timestamps = combinedData.filter(item => item.timestamp >= todayStart)
                    await filterData(currentTimestamp, data.data.ee)

                    lastHour = currentHour; // Uuendame viimase tunni jälgijat
                    console.log("Andmed serverist:", { labels, prices, timestamps });
                    drawChart(labels, prices);
                })
        } catch (error) {
            console.error("Viga börs'i päringus:", error);
        }

    }
    async function filterData(currentTimestamp, data) {
        //const selectedHours=SelectedHourscookie('', get)
        const selectedHours=selectorState.selectedHour;
        const filteredData = data.filter(item => item.timestamp >= currentTimestamp);
        labels = filteredData.map(item => {
            const date = new Date(item.timestamp * 1000);// Muudame millisekunditeks
            let minutes = date.getMinutes();
            if (minutes == 0)  minutes = '00';
            return (date.getHours() + ':' + minutes);
        }).slice(0, selectedHours * 4);
        prices = filteredData.map(item => item.price * 0.124).slice(0, selectedHours * 4);
    }

    function loadUserPreferences() {
        //console.log('loadUserPreferences')
        let userPreferences = getCookie('UserPreferences')
        if (!userPreferences) {
            userPreferences = threshold
            setCookie('UserPreferences', threshold, 365)
        }
        document.getElementById('priceThreshold').value = userPreferences;
        threshold = userPreferences;
        let SelectedHours = SelectedHourscookie('', get)
        if (!SelectedHours) {
            //console.log('SelectedHours=', SelectedHours)
            SelectedHourscookie('24', set)
            SelectedHours='24'
        }
        document.getElementById(SelectedHours + 'h').classList.add('active-btn')
        selectorState.selectedHour=SelectedHours
       // console.log(SelectedHourscookie('', get) + 'h')

    }



    document.getElementById('priceThreshold').addEventListener('change', async () => {
        //console.log('priceThreshold change')
        threshold = (document.getElementById('priceThreshold').value);
        if (isNaN(parseFloat(threshold))) {
            alert("Palun sisesta kehtiv number!");
            return;
        }
        //console.log('priceThreshold change', threshold)


        setCookie('UserPreferences', threshold, 365)
        drawChart(labels, prices)
        /* 

        set(userRef, {
            ip: userIp,
            threshold: threshold,
            //belowThreshold: belowThreshold,
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log("Andmed salvestatud Firebase’i! " + threshold);
        }).catch((error) => {
            console.error("Andmete salvestamine ebaõnnestus:", error);
        }); */
    });

    function drawChart(labels, prices) {
        const mean = data => {
            if (data.length < 1) { return; } return data.reduce((prev, current) => prev + current) / data.length;
        };
        console.log('drawChart threshold=' + threshold +' ' + prices.length)
        const minPrice = Math.min(...prices);  // Leia madalaim hind
        const minIndex = prices.indexOf(minPrice);  // Leia madalaima hinna indeks
        const maxPrice=Math.max(...prices);
        const midPrice=mean(prices);
        
        // Leia järgmine madalaim hind
        let nextMinPrice = Number.MAX_VALUE;
        let nextMinIndex = -1;
        let belowThresholdIndex = -1;
        let belowThreshold = "Pole saadaval";
        let bTTime = '' 
        
       // console.log("minIndex index is " + minIndex)
        if (minIndex !== 0) {
            console.log("minIndex index is not 0")
            nextMinPrice = minPrice;
            nextMinIndex = minIndex;
        }
        prices.forEach((price, index) => {
            if (index !== minIndex && price < nextMinPrice) {
                // Kontrollime, et hind ei ole sama, mis minPrice ja on väiksem kui järgmine madalaim hind
                nextMinPrice = price;
                nextMinIndex = index;
            }
           
            if (belowThresholdIndex === -1 && price < threshold) {
                console.log('belowThreshold' + labels[index])
                
                if (index == 0 && selectorState.day=='refresh') {
                    bTTime = 'Praegu'
                } else {
                    bTTime = `${labels[index]}`
                }
                belowThreshold = `${bTTime} (${prices[index].toFixed(2)} senti/KWh)`;
                //document.getElementById('belowThreshold').textContent = `${labels[index]} (${price.toFixed(2)} senti/KWh)`|| "Pole saadaval";
                belowThresholdIndex = index;
            }
        });
        let lowestPriceRow= ''
        let secondPriceRow=''
        let firstPriceRow=''
        let secondPriceRowPrice=''
        let firstPriceRowPrice=''
        if (selectorState.day=='tomorrow'||selectorState.day=='today') {
            if (selectorState.selectedHour=='24') {
               lowestPriceRow='Päeva odavaim hind on ' 
           secondPriceRow='Päeva kõrgeim hind:senti/KWh'
           firstPriceRow='Päeva keskmine hind:senti/KWh' 
            }else{
                lowestPriceRow='Ajavahemiku odavaim hind on ' 
           secondPriceRow='Ajavahemiku kõrgeim hind:senti/KWh'
           firstPriceRow='Ajavahemiku keskmine hind:senti/KWh' 
        }
           
           secondPriceRowPrice=maxPrice.toFixed(2);
           firstPriceRowPrice=midPrice.toFixed(2);

        } else {
          lowestPriceRow='Järgmine odavaim hind on '  
          secondPriceRow='Järgmise tunni hind:senti/KWh'
          firstPriceRow='Hetke hind:senti/KWh'
          secondPriceRowPrice=prices[1].toFixed(2)
          firstPriceRowPrice=prices[0].toFixed(2)

        };
        
        
        document.getElementById('belowThreshold').textContent = belowThreshold;
        
        document.getElementById('lowestPriceRow').textContent=lowestPriceRow
        //document.glowestPriceRowetElementById('currentPrice').parentElement.parentElement.textContent='xxx:<strong> <span id="currentPrice" class="data">Laadimine...</span></strong>'
        document.getElementById('currentPrice').textContent = firstPriceRowPrice;
         document.getElementById('firstPriceRow').textContent = firstPriceRow;

        document.getElementById('nextHourPrice').textContent = secondPriceRowPrice;
        document.getElementById('secondPriceRow').textContent = secondPriceRow;

        const backgroundColors = prices.map((price, index) => {
            if (index === minIndex) return 'green'; // Kõige madalam hind
            if (index === nextMinIndex) return 'orange'; // Järgmine madalaim hind
            if (price <= threshold) return 'orange';
            return 'rgba(75, 192, 192, 0.2)'; // Muud tulbad
        });
        /* const backgroundColors = prices.map((price, index) => {
            return index === minIndex ? 'green' : 'rgba(75, 192, 192, 0.2)';  // Muuda madalaima hinna tulba värv 
        }); */
        const borderColors = prices.map((price, index) => {
            if (index === minIndex) return 'darkgreen';
            if (index === nextMinIndex) return 'darkorange';
            return 'rgba(75, 192, 192, 1)';
        });
        /*  const borderColors = prices.map((price, index) => {
             return index === minIndex ? 'darkgreen' : 'rgba(75, 192, 192, 1)';  // Muuda madalaima hinna tulba äärise värv
         }); */
        // Kuvame järgmise madalaima hinna kellaaja
        const nextLowestTime = labels[nextMinIndex];
        nextLowestTimestamp=ToTimestamp (nextLowestTime);

        console.log("nextLowestTime=" + nextLowestTime+' '+nextLowestTimestamp)
        document.getElementById('nextLowestTime').textContent =' kell: '+ nextLowestTime  || "Pole saadaval";
        document.getElementById('nextLowestPrice').textContent =  " hind: " + nextMinPrice.toFixed(2) + " senti/KWh " || "Pole saadaval";

        if (chart) {
            chart.destroy();
        }

        const ctx = document.getElementById('priceChart').getContext('2d');
        chart = new Chart(ctx, {
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
                    borderWidth: 0.5,
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
                                //context.Date=new Date( ToTimestamp(label)-now);
                                //const time=context.Date;
                                //console.log('label: '+context.label+' now: ',now)
                                let {hours,minutes,seconds}=getTimeTo(context.label)
                                if (seconds>30)minutes=minutes+=1;

                                const time=( hours+ ':' + minutes);
                                return context.dataIndex === minIndex

                                    ? `${label} ${value.toFixed(2)} s/KWh (madalaim) `+time
                                    : `${label} ${value.toFixed(2)} s/KWh`+` \n` +time;
                            }
                        }
                    }
                }
            }
        });
        //showDataSource();

    }
    const selector = document.getElementsByClassName("selectedDay");
    const selectedHoursButtons = document.getElementsByClassName("selectedHours");
    document.getElementById('refresh').addEventListener('click', function (e) {
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        now = new Date();
         //JSONCookie(timestamps);
        //lastHour = now.getHours()
        //currentTimestamp = new Date(RoundTime(now, 15)).getTime() / 1000
        currentTimestamp = getTimeContext().currentTimestamp
        selectorState.selectedHour=SelectedHourscookie('',get);
        selectorState.day='refresh'
        activeButtonsClassList(selectedHoursButtons,selectorState.selectedHour+ 'h');
        fetchElectricityPrices();
        this.classList.add('active-btn');
    });
    document.getElementById('tomorrow').addEventListener('click', function (e) {
        now = new Date();
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) / 1000;
        currentTimestamp = tomorrow;
        //lastHour=0
        console.log(currentTimestamp)
        activeButtonsClassList(selectedHoursButtons,'24h');
        selectorState.selectedHour='24';
        selectorState.day='tomorrow'
        filterData(tomorrow, timestamps);
        console.log("Andmed mälust tomorrow:", { labels, prices, timestamps });
        //document.getElementById('24h').classList.add('active-btn')
        appState.source = 'memory';
        drawChart(labels, prices);
        this.classList.add('active-btn');

    });
    document.getElementById('today').addEventListener('click', function (e) {
        now = new Date();
        Array.from(selector).forEach(btn => btn.classList.remove('active-btn'));
        today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) / 1000;
        currentTimestamp = today;
        console.log(currentTimestamp)
        activeButtonsClassList(selectedHoursButtons,'24h');
        selectorState.selectedHour='24';
        selectorState.day='today'
        filterData(today, timestamps);
        appState.source = 'memory';
        drawChart(labels, prices);
        this.classList.add('active-btn');
    });

    

    Array.from(selectedHoursButtons).forEach(button => {
        button.addEventListener('click', function () {
            // Remove 'active-btn' class from all buttons
            Array.from(selectedHoursButtons).forEach(btn => btn.classList.remove('active-btn'));
            console.log(button.id)
            
            SelectedHourscookie(button.id.replace(/\D/g, ''), set)
            selectorState.selectedHour=button.id.replace(/\D/g, '');
            // Add 'active-btn' class to the clicked button
            this.classList.add('active-btn');
            filterData(currentTimestamp, timestamps);
            appState.source = 'memory';
            drawChart(labels, prices);
        });
    });
    /**
     * @param {HTMLAllCollection} collection 
     * @param {HTMLElement} element 
     * @param {string} elementId 
     */
    function activeButtonsClassList(collection,elementId) {
        Array.from(collection).forEach(btn => btn.classList.remove('active-btn'));
        
        document.getElementById(elementId).classList.add('active-btn');
       // element.classList.add('active-btn');
    }

    function showDataSource() {
        const el = document.getElementById('dataSource');
        if (!el) return;

        const map = {
            memory: '🧠 Mälust',
            database: '🗄 Andmebaasist',
            server: '🌐 Serverist'
        };

        el.textContent = map[appState.source] || '';
    }

   // console.log('end line 250 threshold=' + threshold)
    window.addEventListener('load', loadUserPreferences());
    //loadUserPreferences()

    
    fetchElectricityPrices();  // Lae hinnad ja joonista graafik
    //setInterval(fetchElectricityPrices(), 5000); // Uuendab hinda iga x minuti tagant
   

});

/**ymardab alla 'step' sammuga 
 * @param {Date} now 
*/
function RoundTime(now, step) {

    // Get current minutes
    let minutes = now.getMinutes();

    let roundedMinutes = Math.floor(minutes / step) * step;

    now.setMinutes(roundedMinutes, 0, 0);

    //console.log("Rounded time:", now.toTimeString().slice(0, 5)); // HH:MM format
    return now
}
/**
 * 
 * @param {Array} data 
 */
function JSONCookie(data) {
   //const obj = {...data};
//const map = new Map(data)
const map  = data.slice(0,48)
    const obj = Object.fromEntries(data);
    let dataJSON = JSON.stringify(map);
setCookie('timestamps', dataJSON, 30)
// Save JSON string to cookie
//document.cookie = `userData=${dataJSON}; SameSite=Lax`;
}

function UserPreferencescookie(value, getSet) {
    if (getSet == get) {
        const userPreferences = getCookie('UserPreferences')
        return userPreferences
    } else if (getSet == set) {
        setCookie('UserPreferences', value, 365)

    }


}
function SelectedHourscookie(value, getSet) {
    if (getSet == get) {
        const selectedHours = getCookie('SelectedHours')
        return selectedHours
    } else if (getSet == set) {
        console.log('stt SelectedHours', value)
        setCookie('SelectedHours', value, 365)

    }

}
/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days
 */
function setCookie(name, value, days) {
    if (typeof name !== "string" || typeof value !== "string") {
        console.error("Cookie name and value must be strings.");
        return;
    }
    let expires = "";
    if (typeof days === "number") {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value || "")}${expires}; path=/; Secure; SameSite=Strict`;
}

/**
 * Get a cookie by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
function getCookie(name) {
    const nameEQ = encodeURIComponent(name) + "=";
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length));
        }
    }
    return null;
}

/**
 * Delete a cookie by name
 * @param {string} name - Cookie name
 */
function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict`;
}
function getTimeContext() {
    const now = new Date();

    return {
        now,
        currentTimestamp: (RoundTime(now, 15)).getTime() / 1000,
        currentHour: now.getHours(),
        currentDate: now.toISOString().split('T')[0],
        todayStart: new Date(
            now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0
        ).getTime() / 1000,
        tomorrowStart: new Date(
            now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0
        ).getTime() / 1000,
        tomorrowEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0).getTime() / 1000
    };
}
/**
 * 
 * @param {string} time - HH:MM
 */
function ToTimestamp(time) {
    const now = new Date();
    const [hrs, mins] = time.split(':')
    
    let timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hrs, mins, 0)
    if (timestamp<RoundTime(now,15)) {
        const today=now.getDate();
        return timestamp.setDate(today+1)/1000
    }
    return timestamp/ 1000
}
/**
 * 
 * @param {*} time - HH:MM
 */
function getTimeTo(time) {
    const now = new Date();
    const timeTo=new Date( ToTimestamp(time)*1000-now);
    return{
         hours : timeTo.getUTCHours(),
        minutes : timeTo.getMinutes(),
        seconds : timeTo.getSeconds()
    };
}
/**
 * 
 * @param {Date} countDownDate 
 */
function updateClock() {
const now = new Date();
const countdownTime=new Date( nextLowestTimestamp*1000-now);
//let hours = now.getHours();
//let minutes = now.getMinutes();
//let seconds = now.getSeconds();
if (labels.length>0  && selectorState.day=='refresh') {
    

if ((RoundTime(now, 15)).getTime()!==ToTimestamp( labels.at(0))*1000){
     document.getElementById('refresh').click()}
}
let hours = countdownTime.getUTCHours();
let minutes = countdownTime.getMinutes();
let seconds = countdownTime.getSeconds();
// Format time to always show two digits
hours = ("0" + hours).slice(-2);
minutes = ("0" + minutes).slice(-2);
seconds = ("0" + seconds).slice(-2);

document.getElementById("clock").textContent = `${hours}:${minutes}:${seconds}`;
}
    setInterval(updateClock, 1000);
    updateClock();