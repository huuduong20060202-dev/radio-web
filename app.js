const globeContainer = document.getElementById('globeViz');

const localCultureDB = {
    VN:{cuisine:["Phở bò","Bánh mì Việt Nam","Bún chả Hà Nội","Gỏi cuốn","Bánh xèo","Cà phê sữa đá"],tourism:["Vịnh Hạ Long","Phố cổ Hội An","Tràng An Ninh Bình","Phong Nha Kẻ Bàng","Đảo Phú Quốc"]},
    JP:{cuisine:["Sushi","Ramen","Takoyaki","Okonomiyaki","Thịt bò Kobe"],tourism:["Núi Phú Sĩ","Fushimi Inari","Shibuya","Lâu đài Himeji","Shirakawa-go"]},
    US:{cuisine:["Hamburger","Hot Dog","New York Pizza","Fried Chicken","Apple Pie"],tourism:["Statue of Liberty","Grand Canyon","Times Square","Yellowstone","Hollywood"]},
    FR:{cuisine:["Baguette","Croissant","Escargot","Foie Gras","French Wine"],tourism:["Eiffel Tower","Louvre Museum","Versailles","Arc de Triomphe"]},
    KR:{cuisine:["Kimchi","Bibimbap","Tteokbokki","Korean BBQ","Japchae"],tourism:["Seoul Tower","Jeju Island","Bukchon Hanok","Gyeongbokgung","Busan"]},
    TH:{cuisine:["Pad Thai","Tom Yum","Green Curry","Mango Sticky Rice","Som Tum"],tourism:["Bangkok","Phuket","Chiang Mai","Phi Phi Island","Ayutthaya"]}
};

let currentCountryData      = null;
let countriesGeoData        = [];
let selectedCountry         = null;
let hoverCountry            = null;
let allCountriesList        = [];
let currentStations         = [];
let currentStationIndex     = 0;
let selectedSuggestionIndex = -1;
let currentViName           = '';
let currentFlagEmoji        = '';
let currentCountryCode      = '';
let db                      = null;
let currentUser             = null;
let favorites               = [];

const audioElement    = document.getElementById('audioElement');
const playPauseBtn    = document.getElementById('playPauseBtn');
const volumeBtn       = document.getElementById('volumeBtn');
const volumeSlider    = document.getElementById('volumeSlider');
const audioVisualizer = document.getElementById('audioVisualizer');
const rightPanel      = document.getElementById('rightPanel');
const localTimePanel  = document.getElementById('localTimePanel');
const telemetryPanel  = document.getElementById('telemetryPanel');
const stationList     = document.getElementById('stationList');
const searchInput     = document.getElementById('countrySearchInput');
const suggestionsBox  = document.getElementById('searchSuggestions');
const liveClock       = document.getElementById('liveClock');
const timezoneText    = document.getElementById('timezoneText');

const globe = Globe()(globeContainer)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .polygonAltitude(d => {
        if (selectedCountry === d.properties.ISO_A2) return 0.05;
        if (hoverCountry    === d.properties.ISO_A2) return 0.02;
        return 0.01;
    })
    .polygonCapColor(d => {
        if (selectedCountry === d.properties.ISO_A2) return 'rgba(0,255,153,0.7)';
        if (hoverCountry    === d.properties.ISO_A2) return 'rgba(100,255,218,0.45)';
        return 'rgba(10,25,47,0.05)';
    })
    .polygonSideColor(() => 'rgba(255,255,255,0.02)')
    .polygonStrokeColor(d => {
        if (selectedCountry === d.properties.ISO_A2) return '#ffffff';
        return 'rgba(100,255,218,0.8)';
    })
    .polygonLabel(({ properties: d }) => `
        <div style="background:rgba(10,25,47,0.95);padding:10px 14px;border-radius:10px;border:1px solid #64ffda;color:white;">
            <b style="color:#64ffda;font-size:14px;">${d.ADMIN}</b><br>
            <span style="font-size:12px;color:#ccd6f6;">Nhấp để khám phá quốc gia</span>
        </div>
    `)
    .onPolygonHover(hoverD => {
        hoverCountry = hoverD?.properties?.ISO_A2 || null;
        refreshCountryHighlight();
    })
    .onPolygonClick(({ properties }) => {
        if (!properties) return;
        const countryCode = properties.ISO_A2;
        if (!countryCode || countryCode === '-99') return;
        selectCountry(countryCode, properties.ADMIN);
        if (properties.LATITUDE && properties.LONGITUDE) {
            globe.pointOfView({ lat: properties.LATITUDE, lng: properties.LONGITUDE, altitude: 0.8 }, 1500);
        }
    });

globe.pointOfView({ altitude: 2.5 });

function resizeGlobe() {
    globe.width(globeContainer.clientWidth);
    globe.height(globeContainer.clientHeight);
}
window.addEventListener('resize', resizeGlobe);
resizeGlobe();

fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
    .then(res  => res.json())
    .then(data => {
        countriesGeoData = data.features;
        allCountriesList = data.features.map(f => f.properties.ADMIN).sort();
        globe.polygonsData(data.features);
    });

const viewer      = document.getElementById('countryViewer');
const viewerTitle = document.getElementById('viewerTitle');
const viewerBody  = document.getElementById('viewerBody');

function openViewer(title, html) {
    viewerTitle.innerHTML = title;
    viewerBody.innerHTML  = html;
    viewer.classList.remove('hidden');
}
function closeViewer() { viewer.classList.add('hidden'); }
document.getElementById('closeViewer').addEventListener('click', closeViewer);

function googleSearch(query) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
}

function refreshCountryHighlight() {
    globe
        .polygonAltitude(d => {
            if (selectedCountry === d.properties.ISO_A2) return 0.1;
            if (hoverCountry    === d.properties.ISO_A2) return 0.02;
            return 0.01;
        })
        .polygonCapColor(() => 'rgba(10,25,47,0.05)')
        .polygonStrokeColor(d => {
            const code = d.properties.ISO_A2;
            if (selectedCountry === code) return 'rgba(100,255,218,1)';
            if (hoverCountry    === code) return 'rgba(100,255,218,0.6)';
            return 'rgba(100,255,218,0.2)';
        });
}

document.getElementById('closeRightBtn').addEventListener('click', () => {
    rightPanel.classList.add('hidden');
});

document.getElementById('overviewBtn').addEventListener('click', () => {
    if (!currentCountryData) return;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(currentCountryData.name + ' country overview')}`;
    openViewer(`🌍 Tổng quan ${currentCountryData.name}`, `
        <div style="line-height:2;font-size:18px;color:#ccd6f6;">${currentCountryData.overview}</div>
        <br>
        <a href="${googleUrl}" target="_blank" style="display:inline-block;margin-top:20px;padding:10px 16px;background:#64ffda;color:#0a192f;border-radius:10px;text-decoration:none;font-weight:700;">
            🔎 Tìm thêm trên Google
        </a>
    `);
});

document.getElementById('cuisineBtn').addEventListener('click', () => {
    if (!currentCountryData) return;
    const foods = currentCountryData.cuisine.map(food => `
        <div class="food-card" onclick="googleSearch('${food}')">
            <div class="card-content"><h3>🍜 ${food}</h3><p>Nhấp để xem trên Google</p></div>
        </div>
    `).join('');
    openViewer(`🍜 Ẩm thực ${currentCountryData.name}`, `<div class="food-grid">${foods}</div>`);
});

document.getElementById('tourismBtn').addEventListener('click', () => {
    if (!currentCountryData) return;
    const places = currentCountryData.tourism.map(place => `
        <div class="place-card" onclick="googleSearch('${place}')">
            <div class="card-content"><h3>✈️ ${place}</h3><p>Nhấp để khám phá trên Google</p></div>
        </div>
    `).join('');
    openViewer(`✈️ Du lịch ${currentCountryData.name}`, `<div class="place-grid">${places}</div>`);
});

audioElement.volume = 1;

playPauseBtn.addEventListener('click', () => {
    if (!audioElement.src) return;
    if (audioElement.paused) {
        audioElement.play();
        playPauseBtn.innerText = '⏸️';
        audioVisualizer.classList.add('playing');
    } else {
        audioElement.pause();
        playPauseBtn.innerText = '▶️';
        audioVisualizer.classList.remove('playing');
    }
});

volumeBtn.addEventListener('click', () => {
    audioElement.muted  = !audioElement.muted;
    volumeBtn.innerText = audioElement.muted ? '🔇' : '🔊';
});

volumeSlider.addEventListener('input', () => {
    audioElement.volume = volumeSlider.value / 100;
    if (audioElement.volume <= 0) {
        audioElement.muted  = true;
        volumeBtn.innerText = '🔇';
    } else {
        audioElement.muted  = false;
        volumeBtn.innerText = '🔊';
    }
});

async function searchCountry(countryNameParam = null) {
    const keyword = countryNameParam || searchInput.value.trim();
    if (!keyword) return;
    try {
        const res  = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(keyword)}`);
        const data = await res.json();
        if (!data || data.status === 404) { alert('Không tìm thấy quốc gia'); return; }
        const country = data[0];
        const code    = country.cca2;
        if (!code) return;
        selectCountry(code, country.name.common);
        if (country.latlng) {
            globe.pointOfView({ lat: country.latlng[0], lng: country.latlng[1], altitude: 0.7 }, 2000);
        }
        suggestionsBox.style.display = 'none';
    } catch (err) {
        console.error(err);
        alert('Lỗi tìm kiếm quốc gia');
    }
}

document.getElementById('countrySearchBtn').addEventListener('click', () => searchCountry());
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchCountry(); });

searchInput.addEventListener('input', renderSuggestions);

suggestionsBox.addEventListener('click', (e) => {
    const item = e.target.closest('.suggest-item');
    if (!item) return;
    searchInput.value            = item.dataset.country;
    suggestionsBox.style.display = 'none';
    searchCountry(item.dataset.country);
});

function renderSuggestions() {
    const keyword = searchInput.value.trim().toLowerCase();
    selectedSuggestionIndex = -1;
    if (!keyword) { suggestionsBox.style.display = 'none'; return; }
    const matched = allCountriesList.filter(c => c.toLowerCase().includes(keyword)).slice(0, 8);
    if (!matched.length) { suggestionsBox.style.display = 'none'; return; }
    suggestionsBox.innerHTML = matched.map(c => `
        <div class="suggest-item" data-country="${c}">🌍 ${c}</div>
    `).join('');
    suggestionsBox.style.display = 'block';
}

searchInput.addEventListener('keydown', e => {
    const items = document.querySelectorAll('.suggest-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) items[selectedSuggestionIndex].click();
        else searchCountry();
        return;
    }
    items.forEach(i => i.classList.remove('active'));
    if (selectedSuggestionIndex >= 0) items[selectedSuggestionIndex].classList.add('active');
});

document.addEventListener('click', e => {
    if (!document.getElementById('searchContainer').contains(e.target)) {
        suggestionsBox.style.display = 'none';
    }
});

function selectCountry(code, countryName = null) {
    if (!code) return;
    selectedCountry = code;
    hoverCountry    = null;
    refreshCountryHighlight();
    fetchCountryAndRadio(code, countryName);
}

function parseTimezoneOffsetMs(rawTZ) {
    if (!rawTZ || rawTZ === 'UTC' || rawTZ === 'UTC+00:00') return 0;
    const match = rawTZ.match(/UTC([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10)) * 60 * 1000;
}

function formatTimeByOffset(offsetMs) {
    const d  = new Date(Date.now() + offsetMs);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

async function fetchWeather(capital) {
    const weatherPanel = document.getElementById('weatherPanel');
    if (!weatherPanel || !capital) return;
    weatherPanel.classList.remove('hidden');
    weatherPanel.innerHTML = `
        <div style="margin-top:10px;padding:10px 12px;background:rgba(100,255,218,0.05);border:1px solid rgba(100,255,218,0.15);border-radius:10px;font-size:12px;color:#8892b0;">
            🌡️ Đang tải thời tiết...
        </div>
    `;
    try {
        const res  = await fetch(`https://wttr.in/${encodeURIComponent(capital)}?format=j1`);
        const data = await res.json();
        const current  = data.current_condition[0];
        const temp     = current.temp_C;
        const feels    = current.FeelsLikeC;
        const humidity = current.humidity;
        const wind     = current.windspeedKmph;
        const desc     = current.lang_vi?.[0]?.value || current.weatherDesc?.[0]?.value || '';
        const code     = parseInt(current.weatherCode, 10);

        function codeToEmoji(c) {
            if (c === 113) return '☀️';
            if (c === 116) return '🌤️';
            if (c === 119 || c === 122) return '☁️';
            if ([143,248,260].includes(c)) return '🌫️';
            if ([176,263,266,293,296].includes(c)) return '🌦️';
            if ([299,302,305,308].includes(c)) return '🌧️';
            if ([311,314,317,320,323,326].includes(c)) return '🌨️';
            if ([329,332,335,338,350,371,374,377].includes(c)) return '❄️';
            if ([200,386,389,392,395].includes(c)) return '⛈️';
            return '🌡️';
        }

        weatherPanel.innerHTML = `
            <div style="margin-top:10px;padding:10px 12px;background:rgba(100,255,218,0.05);border:1px solid rgba(100,255,218,0.15);border-radius:10px;animation:fadeInUp 0.4s ease;">
                <div style="font-size:12px;color:#8892b0;margin-bottom:6px;">🌡️ Thời tiết tại ${capital}</div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:28px;">${codeToEmoji(code)}</span>
                    <div>
                        <div style="font-size:22px;font-weight:700;color:#ccd6f6;">${temp}°C</div>
                        <div style="font-size:12px;color:#8892b0;text-transform:capitalize;">${desc}</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;font-size:11px;color:#8892b0;text-align:center;">
                    <div><div style="color:#64ffda;font-size:13px;font-weight:600;">${feels}°C</div>Cảm giác</div>
                    <div><div style="color:#64ffda;font-size:13px;font-weight:600;">${humidity}%</div>Độ ẩm</div>
                    <div><div style="color:#64ffda;font-size:13px;font-weight:600;">${wind} km/h</div>Gió</div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Weather error:', err);
        weatherPanel.innerHTML = `
            <div style="margin-top:10px;padding:8px 12px;font-size:12px;color:#8892b0;">🌡️ Không tải được thời tiết</div>
        `;
    }
}

function fetchCountryAndRadio(code) {
    fetch(`https://restcountries.com/v3.1/alpha/${code}`)
        .then(res  => res.json())
        .then(async data => {
            const country = data[0];
            const viName  = country.translations?.vie?.common || country.name.common;
            const capital = country.capital?.[0] || '';

            currentCountryCode = code;
            currentViName      = viName;
            currentFlagEmoji   = country.flag || '';

            document.getElementById('rpFlag').src              = country.flags.png;
            document.getElementById('rpCountryName').innerText = viName;
            document.getElementById('rpCapital').innerText     = capital || 'Không rõ';
            document.getElementById('rpPopulation').innerText  = country.population.toLocaleString();
            document.getElementById('rpArea').innerText        = country.area.toLocaleString() + ' km²';

            if (country.latlng) {
                telemetryPanel.classList.remove('hidden');
                document.getElementById('telLat').innerText = country.latlng[0];
                document.getElementById('telLng').innerText = country.latlng[1];
            }

            if (window.clockInterval) { clearInterval(window.clockInterval); window.clockInterval = null; }
            if (country.timezones?.length) {
                localTimePanel.classList.remove('hidden');
                const rawTZ    = country.timezones[0] || 'UTC+00:00';
                const offsetMs = parseTimezoneOffsetMs(rawTZ);
                timezoneText.innerText = rawTZ;
                function updateClock() { liveClock.textContent = formatTimeByOffset(offsetMs); }
                updateClock();
                window.clockInterval = setInterval(updateClock, 1000);
            } else {
                localTimePanel.classList.add('hidden');
            }

            if (capital) fetchWeather(capital);

            rightPanel.classList.remove('hidden');

            currentCountryData = await loadCultureData(viName, code);
            loadRadioStations(code, viName, country.flag || '');
        });
}

async function loadCultureData(baseName, countryCode) {
    try {
        const searchRes  = await fetch(
            `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(baseName)}&utf8=&format=json&origin=*`
        );
        const searchData = await searchRes.json();
        let exactName    = baseName;
        if (searchData.query.search.length) exactName = searchData.query.search[0].title;

        const summaryRes  = await fetch(
            `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactName)}`
        );
        const summaryData = await summaryRes.json();

        return {
            name:     exactName,
            overview: summaryData.extract || `Thông tin tổng quan về ${exactName}.`,
            cuisine:  localCultureDB[countryCode]?.cuisine  || [`${exactName} traditional food`, `${exactName} street food`],
            tourism:  localCultureDB[countryCode]?.tourism  || [`${exactName} tourism`, `${exactName} landmarks`]
        };
    } catch (err) {
        console.error(err);
        return null;
    }
}

function loadRadioStations(code, viName, flagEmoji) {
    stationList.innerHTML = `<div class="empty-station">Đang tải radio...</div>`;
    fetch(`https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${code.toLowerCase()}`)
        .then(res => res.json())
        .then(stations => {
            currentStations = stations
                .filter(s => s.url_resolved && s.url_resolved.startsWith('https://'))
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 30);
            if (!currentStations.length) {
                stationList.innerHTML = `<div class="empty-station">Không có radio khả dụng</div>`;
                return;
            }
            playStation(0, viName, flagEmoji);
            renderStationList();
        })
        .catch(() => {
            stationList.innerHTML = `<div class="empty-station">Không tải được radio</div>`;
        });
}

function playStation(index, viName = '', flagEmoji = '') {
    currentStationIndex = index;
    const station = currentStations[index];
    if (!station) return;
    document.querySelector('.broadcast-details').innerHTML = `
        <p><span class="icon">📍</span> Quốc gia: ${viName} ${flagEmoji}</p>
        <p><span class="icon">🎧</span> Trạm: <span style="color:#64ffda;">${station.name}</span></p>
    `;
    audioElement.src = station.url_resolved;
    audioElement.play().catch(err => console.log('Autoplay blocked:', err));
    playPauseBtn.innerText = '⏸️';
    audioVisualizer.classList.remove('hidden');
    audioVisualizer.classList.add('playing');
    renderStationList();
}

function isFavorite(stationuuid) {
    return favorites.some(f => f.stationuuid === stationuuid);
}

function renderStationList() {
    stationList.innerHTML = currentStations.map((station, index) => `
        <div class="station-item ${index === currentStationIndex ? 'active' : ''}" onclick="playStation(${index})">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
                <div class="station-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${index === currentStationIndex ? '🎵' : '📻'} ${station.name}
                </div>
                <button class="fav-btn ${isFavorite(station.stationuuid) ? 'fav-active' : ''}"
                    onclick="event.stopPropagation();toggleFavorite(${index})"
                    title="${isFavorite(station.stationuuid) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}"
                >
                    ${isFavorite(station.stationuuid) ? '❤️' : '🤍'}
                </button>
            </div>
            <div class="station-meta">👍 ${station.votes || 0} • ${station.language || 'Unknown'}</div>
        </div>
    `).join('');
    window.playStation  = playStation;
    window.googleSearch = googleSearch;
}

async function toggleFavorite(index) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để lưu yêu thích!');
        return;
    }
    const station = currentStations[index];
    if (!station) return;

    const alreadyFav = isFavorite(station.stationuuid);

    if (alreadyFav) {
        const docRef = db.collection('favorites')
            .doc(currentUser.uid)
            .collection('stations')
            .doc(station.stationuuid);
        await docRef.delete();
        favorites = favorites.filter(f => f.stationuuid !== station.stationuuid);
        showToast('Đã xóa khỏi yêu thích');
    } else {
        const favData = {
            stationuuid:  station.stationuuid,
            name:         station.name,
            url_resolved: station.url_resolved,
            countryCode:  currentCountryCode,
            countryName:  currentViName,
            flagEmoji:    currentFlagEmoji,
            votes:        station.votes || 0,
            language:     station.language || '',
            savedAt:      firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('favorites')
            .doc(currentUser.uid)
            .collection('stations')
            .doc(station.stationuuid)
            .set(favData);
        favorites.push(favData);
        showToast('Đã thêm vào yêu thích ❤️');
    }

    renderStationList();
    renderFavoriteList();
}

async function loadFavorites() {
    if (!currentUser || !db) return;
    try {
        const snap = await db.collection('favorites')
            .doc(currentUser.uid)
            .collection('stations')
            .orderBy('savedAt', 'desc')
            .get();
        favorites = snap.docs.map(d => d.data());
        renderFavoriteList();
        renderStationList();
    } catch (err) {
        console.error('Load favorites error:', err);
    }
}

function playFavorite(index) {
    const fav = favorites[index];
    if (!fav) return;
    currentStations     = [fav];
    currentStationIndex = 0;
    currentCountryCode  = fav.countryCode  || '';
    currentViName       = fav.countryName  || '';
    currentFlagEmoji    = fav.flagEmoji    || '';
    document.querySelector('.broadcast-details').innerHTML = `
        <p><span class="icon">📍</span> Quốc gia: ${fav.countryName} ${fav.flagEmoji}</p>
        <p><span class="icon">🎧</span> Trạm: <span style="color:#64ffda;">${fav.name}</span></p>
    `;
    audioElement.src = fav.url_resolved;
    audioElement.play().catch(err => console.log('Autoplay blocked:', err));
    playPauseBtn.innerText = '⏸️';
    audioVisualizer.classList.remove('hidden');
    audioVisualizer.classList.add('playing');
}

async function removeFavorite(index) {
    if (!currentUser) return;
    const fav = favorites[index];
    if (!fav) return;
    await db.collection('favorites')
        .doc(currentUser.uid)
        .collection('stations')
        .doc(fav.stationuuid)
        .delete();
    favorites.splice(index, 1);
    renderFavoriteList();
    renderStationList();
    showToast('Đã xóa khỏi yêu thích');
}

function renderFavoriteList() {
    const container = document.getElementById('favoritesList');
    const section   = document.getElementById('favoritesSection');
    if (!container || !section) return;

    if (!currentUser) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    const favCount = document.getElementById('favCount');
    if (favCount) favCount.textContent = favorites.length;

    if (!favorites.length) {
        container.innerHTML = `<div class="empty-station">Chưa có đài yêu thích nào</div>`;
        return;
    }

    container.innerHTML = favorites.map((fav, index) => `
        <div class="station-item fav-item" onclick="playFavorite(${index})">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
                <div class="station-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ❤️ ${fav.name}
                </div>
                <button class="fav-btn fav-remove"
                    onclick="event.stopPropagation();removeFavorite(${index})"
                    title="Xóa yêu thích"
                >🗑️</button>
            </div>
            <div class="station-meta">${fav.flagEmoji} ${fav.countryName} • ${fav.language || 'Unknown'}</div>
        </div>
    `).join('');

    window.playFavorite   = playFavorite;
    window.removeFavorite = removeFavorite;
}

function showToast(msg) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

const loginBtn  = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo  = document.getElementById('userInfo');

if (loginBtn) {
    loginBtn.onclick = async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result   = await auth.signInWithPopup(provider);
            renderUser(result.user);
        } catch (err) {
            console.error(err);
            alert('Login failed');
        }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await auth.signOut();
        currentUser             = null;
        favorites               = [];
        loginBtn.style.display  = 'block';
        logoutBtn.style.display = 'none';
        userInfo.innerHTML      = '';
        renderFavoriteList();
        renderStationList();
    };
}

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        db = firebase.firestore();
        renderUser(user);
        loadFavorites();
    } else {
        favorites = [];
        userInfo.innerHTML = '';
        renderFavoriteList();
    }
});

function renderUser(user) {
    loginBtn.style.display  = 'none';
    logoutBtn.style.display = 'block';
    userInfo.innerHTML = `
        <img src="${user.photoURL}">
        <div><h3>${user.displayName}</h3><p style="font-size:10px;color:#8892b0;">${user.email}</p></div>
    `;
}

window.toggleFavorite = toggleFavorite;
