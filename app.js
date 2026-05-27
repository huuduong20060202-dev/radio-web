const globeContainer = document.getElementById('globeViz');

const localCultureDB = {

    VN: {
        cuisine: [
            "Phở bò",
            "Bánh mì Việt Nam",
            "Bún chả Hà Nội",
            "Gỏi cuốn",
            "Bánh xèo",
            "Cà phê sữa đá"
        ],

        tourism: [
            "Vịnh Hạ Long",
            "Phố cổ Hội An",
            "Tràng An Ninh Bình",
            "Phong Nha Kẻ Bàng",
            "Đảo Phú Quốc"
        ]
    },

    JP: {
        cuisine: [
            "Sushi",
            "Ramen",
            "Takoyaki",
            "Okonomiyaki",
            "Thịt bò Kobe"
        ],

        tourism: [
            "Núi Phú Sĩ",
            "Fushimi Inari",
            "Shibuya",
            "Lâu đài Himeji",
            "Shirakawa-go"
        ]
    },

    US: {
        cuisine: [
            "Hamburger",
            "Hot Dog",
            "New York Pizza",
            "Fried Chicken",
            "Apple Pie"
        ],

        tourism: [
            "Statue of Liberty",
            "Grand Canyon",
            "Times Square",
            "Yellowstone",
            "Hollywood"
        ]
    },

    FR: {
        cuisine: [
            "Baguette",
            "Croissant",
            "Escargot",
            "Foie Gras",
            "French Wine"
        ],

        tourism: [
            "Eiffel Tower",
            "Louvre Museum",
            "Versailles",
            "Arc de Triomphe"
        ]
    },

    KR: {
        cuisine: [
            "Kimchi",
            "Bibimbap",
            "Tteokbokki",
            "Korean BBQ",
            "Japchae"
        ],

        tourism: [
            "Seoul Tower",
            "Jeju Island",
            "Bukchon Hanok",
            "Gyeongbokgung",
            "Busan"
        ]
    },

    TH: {
        cuisine: [
            "Pad Thai",
            "Tom Yum",
            "Green Curry",
            "Mango Sticky Rice",
            "Som Tum"
        ],

        tourism: [
            "Bangkok",
            "Phuket",
            "Chiang Mai",
            "Phi Phi Island",
            "Ayutthaya"
        ]
    }
};


let currentCountryData = null;
let countriesGeoData = [];
let selectedCountry = null;
let hoverCountry = null;
let allCountriesList = [];

let currentStations = [];
let currentStationIndex = 0;
let selectedSuggestionIndex = -1;


const audioElement =
    document.getElementById('audioElement');

const playPauseBtn =
    document.getElementById('playPauseBtn');

const volumeBtn =
    document.getElementById('volumeBtn');

const volumeSlider =
    document.getElementById('volumeSlider');
volumeSlider.addEventListener('input', () => {

    audioElement.volume =
        volumeSlider.value / 100;
});

const audioVisualizer =
    document.getElementById('audioVisualizer');

const rightPanel =
    document.getElementById('rightPanel');

const localTimePanel =
    document.getElementById('localTimePanel');

const telemetryPanel =
    document.getElementById('telemetryPanel');

const stationList =
    document.getElementById('stationList');

const searchInput =
    document.getElementById('countrySearchInput');

const suggestionsBox =
    document.getElementById('searchSuggestions');


const globe = Globe()(globeContainer)

.globeImageUrl(
    'https://unpkg.com/three-globe/example/img/earth-night.jpg'
)

.bumpImageUrl(
    'https://unpkg.com/three-globe/example/img/earth-topology.png'
)

.backgroundImageUrl(
    'https://unpkg.com/three-globe/example/img/night-sky.png'
)

.polygonAltitude(d => {

    if(selectedCountry === d.properties.ISO_A2){
        return 0.05;
    }

    if(hoverCountry === d.properties.ISO_A2){
        return 0.02;
    }

    return 0.01;
})

.polygonCapColor(d => {

    if(selectedCountry === d.properties.ISO_A2){
        return 'rgba(0, 255, 153, 0.7)';
    }

    if(hoverCountry === d.properties.ISO_A2){
        return 'rgba(100,255,218,0.45)';
    }

    return 'rgba(10,25,47,0.05)';
})

.polygonSideColor(() => 'rgba(255,255,255,0.02)')

.polygonStrokeColor(d => {

    if(selectedCountry === d.properties.ISO_A2){
        return '#ffffff';
    }

    return 'rgba(100,255,218,0.8)';
})


.polygonLabel(({ properties: d }) => `
    <div style="
        background: rgba(10,25,47,0.95);
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid #64ffda;
        color: white;
    ">
        <b style="
            color:#64ffda;
            font-size:14px;
        ">
            ${d.ADMIN}
        </b>

        <br>

        <span style="
            font-size:12px;
            color:#ccd6f6;
        ">
            Nhấp để khám phá quốc gia
        </span>
    </div>
`)

.onPolygonHover(hoverD => {

    hoverCountry =
        hoverD?.properties?.ISO_A2 || null;

    refreshCountryHighlight();
})

.onPolygonClick(({ properties }) => {

    if (!properties) return;

    const countryCode = properties.ISO_A2;

    if (!countryCode || countryCode === "-99") return;

    selectCountry(countryCode, properties.ADMIN);

    if (properties.LATITUDE && properties.LONGITUDE) {

        globe.pointOfView({
            lat: properties.LATITUDE,
            lng: properties.LONGITUDE,
            altitude: 0.8
        }, 1500);

        fetchCountryAndRadio(countryCode);
    }
});

globe.pointOfView({
    altitude: 2.5
});

window.addEventListener('resize', () => {

    globe.width(globeContainer.clientWidth);

    globe.height(globeContainer.clientHeight);
});


fetch(
    'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson'
)

.then(res => res.json())

.then(data => {

    countriesGeoData = data.features;

    allCountriesList =
        data.features
        .map(f => f.properties.ADMIN)
        .sort();

    globe.polygonsData(data.features);
});


const viewer =
    document.getElementById('countryViewer');

const viewerTitle =
    document.getElementById('viewerTitle');

const viewerBody =
    document.getElementById('viewerBody');

function openViewer(title, html){

    viewerTitle.innerHTML = title;

    viewerBody.innerHTML = html;

    viewer.classList.remove('hidden');
}

function closeViewer(){

    viewer.classList.add('hidden');
}

document
.getElementById('closeViewer')
.addEventListener('click', closeViewer);

// =======================================================================
// HELPERS
// =======================================================================

function googleSearch(query){

    window.open(
        `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        '_blank'
    );
}

function refreshCountryHighlight() {

    globe
        .polygonAltitude(d => {
            if (selectedCountry === d.properties.ISO_A2) return 0.1;
            if (hoverCountry === d.properties.ISO_A2) return 0.02;
            return 0.01;
        })
        .polygonCapColor(() => {
            return 'rgba(10,25,47,0.05)';
        })
        .polygonStrokeColor(d => {

            const code = d.properties.ISO_A2;

            if (selectedCountry === code) {
                return 'rgba(100,255,218,1)';
            }

            if (hoverCountry === code) {
                return 'rgba(100,255,218,0.6)';
            }

            return 'rgba(100,255,218,0.2)';
        });
}


document
.getElementById('closeRightBtn')
.addEventListener('click', () => {

    rightPanel.classList.add('hidden');
});

document.getElementById('overviewBtn')
.addEventListener('click', () => {

    if (!currentCountryData) return;

    const query = currentCountryData.name;

    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " country overview")}`;

    openViewer(
        `🌍 Tổng quan ${currentCountryData.name}`,
        `
        <div style="line-height:2;font-size:18px;color:#ccd6f6;">
            ${currentCountryData.overview}
        </div>

        <br>

        <a href="${googleUrl}" target="_blank" style="
            display:inline-block;
            margin-top:20px;
            padding:10px 16px;
            background:#64ffda;
            color:#0a192f;
            border-radius:10px;
            text-decoration:none;
            font-weight:700;
        ">
            🔎 Tìm thêm trên Google
        </a>
        `
    );
});

document
.getElementById('cuisineBtn')
.addEventListener('click', () => {

    if(!currentCountryData) return;

    const foods =
        currentCountryData.cuisine
        .map(food => `

            <div
                class="food-card"
                onclick="googleSearch('${food}')"
            >

                <div class="card-content">

                    <h3>🍜 ${food}</h3>

                    <p>
                        Nhấp để xem trên Google
                    </p>

                </div>

            </div>

        `)
        .join('');

    openViewer(

        `🍜 Ẩm thực ${currentCountryData.name}`,

        `
        <div class="food-grid">
            ${foods}
        </div>
        `
    );
});

document
.getElementById('tourismBtn')
.addEventListener('click', () => {

    if(!currentCountryData) return;

    const places =
        currentCountryData.tourism
        .map(place => `

            <div
                class="place-card"
                onclick="googleSearch('${place}')"
            >

                <div class="card-content">

                    <h3>✈️ ${place}</h3>

                    <p>
                        Nhấp để khám phá trên Google
                    </p>

                </div>

            </div>

        `)
        .join('');

    openViewer(

        `✈️ Du lịch ${currentCountryData.name}`,

        `
        <div class="place-grid">
            ${places}
        </div>
        `
    );
});


audioElement.volume = 1;

playPauseBtn.addEventListener('click', () => {

    if(!audioElement.src) return;

    if(audioElement.paused){

        audioElement.play();

        playPauseBtn.innerText = '⏸️';

        audioVisualizer.classList.add('playing');
    }
    else{

        audioElement.pause();

        playPauseBtn.innerText = '▶️';

        audioVisualizer.classList.remove('playing');
    }
});

volumeBtn.addEventListener('click', () => {

    audioElement.muted =
        !audioElement.muted;

    volumeBtn.innerText =
        audioElement.muted ? '🔇' : '🔊';
});

volumeSlider.addEventListener('input', () => {

    audioElement.volume =
        volumeSlider.value / 100;

    if(audioElement.volume <= 0){

        audioElement.muted = true;

        volumeBtn.innerText = '🔇';
    }
    else{

        audioElement.muted = false;

        volumeBtn.innerText = '🔊';
    }
});


async function searchCountry(countryNameParam = null) {

    const keyword = countryNameParam || searchInput.value.trim();
    if (!keyword) return;

    try {

        const res = await fetch(
            `https://restcountries.com/v3.1/name/${encodeURIComponent(keyword)}`
        );

        const data = await res.json();

        if (!data || data.status === 404) {
            alert('Không tìm thấy quốc gia');
            return;
        }

        const country = data[0];

        const code = country.cca2;

        if (!code) return;

        selectCountry(code, country.name.common);

        if (country.latlng) {
            globe.pointOfView({
                lat: country.latlng[0],
                lng: country.latlng[1],
                altitude: 0.7
            }, 2000);
        }

        suggestionsBox.style.display = 'none';

    } catch (err) {
        console.error(err);
        alert('Lỗi tìm kiếm quốc gia');
    }
}

document
.getElementById('countrySearchBtn')
.addEventListener('click', () => {

    searchCountry();
});

searchInput.addEventListener('keypress', e => {

    if(e.key === 'Enter'){

        searchCountry();
    }
});


searchInput.addEventListener(
    'input',
    renderSuggestions
);

function selectCountry(code, countryName = null) {

    if (!code) return;

    selectedCountry = code;
    hoverCountry = null;

    refreshCountryHighlight();

    fetchCountryAndRadio(code, countryName);
}

function renderSuggestions(){

    const keyword =
        searchInput.value
        .trim()
        .toLowerCase();

    selectedSuggestionIndex = -1;

    if(!keyword){

        suggestionsBox.style.display = 'none';

        return;
    }

    const matched =
        allCountriesList
        .filter(country =>
            country
            .toLowerCase()
            .includes(keyword)
        )
        .slice(0, 8);

    if(!matched.length){

        suggestionsBox.style.display = 'none';

        return;
    }

    suggestionsBox.innerHTML =
        matched.map((country, index) => `

            <div
                class="suggest-item"
                data-country="${country}"
            >
                🌍 ${country}
            </div>

        `).join('');

    suggestionsBox.style.display = 'block';

    suggestionsBox.addEventListener('click', (e) => {
        const item = e.target.closest('.suggest-item');
        if (!item) return;

        const countryName = item.dataset.country;

        searchInput.value = countryName;
        suggestionsBox.style.display = 'none';

        searchCountry(countryName);
    });
}

searchInput.addEventListener('keydown', e => {

    const items =
        document.querySelectorAll('.suggest-item');

    if(!items.length) return;

    if(e.key === 'ArrowDown'){

        e.preventDefault();

        selectedSuggestionIndex++;

        if(selectedSuggestionIndex >= items.length){

            selectedSuggestionIndex = 0;
        }
    }

    else if(e.key === 'ArrowUp'){

        e.preventDefault();

        selectedSuggestionIndex--;

        if(selectedSuggestionIndex < 0){

            selectedSuggestionIndex =
                items.length - 1;
        }
    }

    else if(e.key === 'Enter'){

        e.preventDefault();

        if(selectedSuggestionIndex >= 0){

            items[selectedSuggestionIndex].click();
        }
        else{

            searchCountry();
        }

        return;
    }

    items.forEach(item =>
        item.classList.remove('active')
    );

    if(selectedSuggestionIndex >= 0){

        items[selectedSuggestionIndex]
        .classList.add('active');
    }
});

document.addEventListener('click', e => {

    if(!document
        .getElementById('searchContainer')
        .contains(e.target)
    ){

        suggestionsBox.style.display =
            'none';
    }
});



function parseTimezoneOffsetMs(rawTZ) {
    if (rawTZ === 'UTC' || rawTZ === 'UTC+00:00') return 0;
    const match = rawTZ.match(/UTC([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const sign  = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const mins  = parseInt(match[3], 10);
    return sign * (hours * 60 + mins) * 60 * 1000;
}

function formatTimeByOffset(offsetMs) {
    // Date.now() đã là UTC ms — cộng thẳng offset vào là đủ
    const localMs = Date.now() + offsetMs;
    const d       = new Date(localMs);
    const hh      = String(d.getUTCHours()).padStart(2, '0');
    const mm      = String(d.getUTCMinutes()).padStart(2, '0');
    const ss      = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}


function fetchCountryAndRadio(code) {

    fetch(
        `https://restcountries.com/v3.1/alpha/${code}`
    )

    .then(res => res.json())

    .then(async data => {

        const country = data[0];

        const viName =
            country.translations?.vie?.common
            || country.name.common;

        document.getElementById('rpFlag').src =
            country.flags.png;

        document.getElementById('rpCountryName')
            .innerText = viName;

        document.getElementById('rpCapital')
            .innerText =
            country.capital?.[0] || 'Không rõ';

        document.getElementById('rpPopulation')
            .innerText =
            country.population.toLocaleString();

        document.getElementById('rpArea')
            .innerText =
            country.area.toLocaleString() + ' km²';

        if (country.latlng) {

            telemetryPanel.classList.remove('hidden');

            document.getElementById('telLat')
                .innerText = country.latlng[0];

            document.getElementById('telLng')
                .innerText = country.latlng[1];
        }


        if (window.clockInterval) {
            clearInterval(window.clockInterval);
            window.clockInterval = null;
        }

        if (country.timezones?.length) {

            localTimePanel.classList.remove('hidden');

            const rawTZ = country.timezones[0] || 'UTC+00:00';

            // Hiển thị label múi giờ gốc (vd: UTC+07:00)
            timezoneText.innerText = rawTZ;

            // Parse offset 1 lần, dùng lại mỗi tick
            const offsetMs = parseTimezoneOffsetMs(rawTZ);

            function updateClock() {
                liveClock.textContent = formatTimeByOffset(offsetMs);
            }

            updateClock(); // render ngay lập tức, không chờ 1s

            window.clockInterval = setInterval(updateClock, 1000);

        } else {

            localTimePanel.classList.add('hidden');
        }

        // ------------------------------------------------------------------

        rightPanel.classList.remove('hidden');

        currentCountryData =
            await loadCultureData(
                viName,
                code
            );

        loadRadioStations(
            code,
            viName,
            country.flag || ''
        );
    });
}


async function loadCultureData(baseName, countryCode){

    try{

        const searchUrl =
            `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(baseName)}&utf8=&format=json&origin=*`;

        const searchRes =
            await fetch(searchUrl);

        const searchData =
            await searchRes.json();

        let exactName = baseName;

        if(searchData.query.search.length){

            exactName =
                searchData.query.search[0].title;
        }

        const summaryRes =
            await fetch(
                `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactName)}`
            );

        const summaryData =
            await summaryRes.json();

        return {

            name: exactName,

            overview:
                summaryData.extract ||
                `Thông tin tổng quan về ${exactName}.`,

            cuisine:
                localCultureDB[countryCode]?.cuisine ||

                [
                    `${exactName} traditional food`,
                    `${exactName} street food`
                ],

            tourism:
                localCultureDB[countryCode]?.tourism ||

                [
                    `${exactName} tourism`,
                    `${exactName} landmarks`
                ]
        };
    }

    catch(err){

        console.error(err);

        return null;
    }
}


function loadRadioStations(code, viName, flagEmoji){

    stationList.innerHTML = `
        <div class="empty-station">
            Đang tải radio...
        </div>
    `;

    fetch(
        `https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${code.toLowerCase()}`
    )

    .then(res => res.json())

    .then(stations => {

        currentStations =
            stations

            .filter(s =>
                s.url_resolved &&
                s.url_resolved.startsWith('https://')
            )

            .sort((a,b) =>
                b.votes - a.votes
            )

            .slice(0, 30);

        if(!currentStations.length){

            stationList.innerHTML = `
                <div class="empty-station">
                    Không có radio khả dụng
                </div>
            `;

            return;
        }

        playStation(
            0,
            viName,
            flagEmoji
        );

        renderStationList();
    })

    .catch(() => {

        stationList.innerHTML = `
            <div class="empty-station">
                Không tải được radio
            </div>
        `;
    });
}

function playStation(index, viName='', flagEmoji=''){

    currentStationIndex = index;

    const station =
        currentStations[index];

    if(!station) return;

    document.querySelector('.broadcast-details')
    .innerHTML = `
        <p>
            <span class="icon">📍</span>
            Quốc gia:
            ${viName} ${flagEmoji}
        </p>

        <p>
            <span class="icon">🎧</span>
            Trạm:
            <span style="color:#64ffda;">
                ${station.name}
            </span>
        </p>
    `;

    audioElement.src =
        station.url_resolved;

    audioElement.play().catch(err => {
        console.log("Autoplay blocked:", err);
    });

    playPauseBtn.innerText = '⏸️';

    audioVisualizer.classList.remove('hidden');

    audioVisualizer.classList.add('playing');

    renderStationList();
}

function renderStationList(){

    stationList.innerHTML =
        currentStations.map((station, index) => `

            <div
                class="
                    station-item
                    ${index === currentStationIndex ? 'active' : ''}
                "
                onclick="
                    playStation(${index})
                "
            >

                <div class="station-name">
                    ${index === currentStationIndex ? '🎵' : '📻'}
                    ${station.name}
                </div>

                <div class="station-meta">
                    👍 ${station.votes || 0}
                    •
                    ${station.language || 'Unknown'}
                </div>

            </div>

        `).join('');

    window.playStation = playStation;
    window.googleSearch = googleSearch;
}


const loginBtn =
    document.getElementById('loginBtn');

const logoutBtn =
    document.getElementById('logoutBtn');

const userInfo =
    document.getElementById('userInfo');

// LOGIN

if(loginBtn){

    loginBtn.onclick = async () => {

        try{

            const provider =
                new firebase.auth.GoogleAuthProvider();

            const result =
                await auth.signInWithPopup(provider);

            const user =
                result.user;

            renderUser(user);

        }
        catch(err){

            console.error(err);

            alert("Login failed");

        }

    };

}


if(logoutBtn){

    logoutBtn.onclick = async () => {

        await auth.signOut();

        loginBtn.style.display = 'block';

        logoutBtn.style.display = 'none';

        userInfo.innerHTML = '';

    };

}

// AUTO LOGIN SESSION

auth.onAuthStateChanged((user) => {

    if(user){

        renderUser(user);

    }
    else{

        userInfo.innerHTML = '';

    }

});

function renderUser(user){

    loginBtn.style.display = 'none';

    logoutBtn.style.display = 'block';

    userInfo.innerHTML = `

        <img src="${user.photoURL}">

        <div>

            <h3>${user.displayName}</h3>

            <p>${user.email}</p>

        </div>

    `;

}
