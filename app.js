// =============================================
// GLOBE & RADIO — original logic
// =============================================

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
        weatherPanel.innerHTML = `<div style="margin-top:10px;padding:8px 12px;font-size:12px;color:#8892b0;">🌡️ Không tải được thời tiết</div>`;
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
                >${isFavorite(station.stationuuid) ? '❤️' : '🤍'}</button>
            </div>
            <div class="station-meta">👍 ${station.votes || 0} • ${station.language || 'Unknown'}</div>
        </div>
    `).join('');
    window.playStation  = playStation;
    window.googleSearch = googleSearch;
}

async function toggleFavorite(index) {
    if (!currentUser) { alert('Vui lòng đăng nhập để lưu yêu thích!'); return; }
    const station    = currentStations[index];
    if (!station) return;
    const alreadyFav = isFavorite(station.stationuuid);

    if (alreadyFav) {
        await db.collection('favorites').doc(currentUser.uid).collection('stations').doc(station.stationuuid).delete();
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
        await db.collection('favorites').doc(currentUser.uid).collection('stations').doc(station.stationuuid).set(favData);
        favorites.push(favData);
        showToast('Đã thêm vào yêu thích ❤️');
    }
    renderStationList();
    renderFavoriteList();
}

async function loadFavorites() {
    if (!currentUser || !db) return;
    try {
        const snap = await db.collection('favorites').doc(currentUser.uid).collection('stations').orderBy('savedAt', 'desc').get();
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
    await db.collection('favorites').doc(currentUser.uid).collection('stations').doc(fav.stationuuid).delete();
    favorites.splice(index, 1);
    renderFavoriteList();
    renderStationList();
    showToast('Đã xóa khỏi yêu thích');
}

function renderFavoriteList() {
    const container = document.getElementById('favoritesList');
    const section   = document.getElementById('favoritesSection');
    if (!container || !section) return;
    if (!currentUser) { section.classList.add('hidden'); return; }
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
                <div class="station-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">❤️ ${fav.name}</div>
                <button class="fav-btn fav-remove" onclick="event.stopPropagation();removeFavorite(${index})" title="Xóa yêu thích">🗑️</button>
            </div>
            <div class="station-meta">${fav.flagEmoji} ${fav.countryName} • ${fav.language || 'Unknown'}</div>
        </div>
    `).join('');
    window.playFavorite   = playFavorite;
    window.removeFavorite = removeFavorite;
}

function showToast(msg) {
    let toast = document.getElementById('toastMsg');
    if (!toast) { toast = document.createElement('div'); toast.id = 'toastMsg'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// =============================================
// AUTH
// =============================================

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
        chatUnsubscribers.forEach(unsub => unsub());
        chatUnsubscribers = [];
        await auth.signOut();
        currentUser             = null;
        favorites               = [];
        loginBtn.style.display  = 'block';
        logoutBtn.style.display = 'none';
        userInfo.innerHTML      = '';
        document.getElementById('chatToggleBtn').classList.add('hidden');
        document.getElementById('chatPanel').classList.add('hidden');
        document.getElementById('chatWindowsContainer').innerHTML = '';
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
        initChatSystem();
    } else {
        favorites = [];
        userInfo.innerHTML = '';
        renderFavoriteList();
        document.getElementById('chatToggleBtn').classList.add('hidden');
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

// =============================================
// CHAT SYSTEM
// =============================================

let friendsList        = [];
let friendRequests     = [];
let openChatWindows    = {};   // friendUid -> DOM element
let chatUnsubscribers  = [];   // realtime listeners to detach on logout
let totalUnread        = 0;

function initChatSystem() {
    const btn = document.getElementById('chatToggleBtn');
    btn.classList.remove('hidden');

    // Save/update own profile so others can find us by email
    db.collection('users').doc(currentUser.uid).set({
        uid:         currentUser.uid,
        email:       currentUser.email,
        displayName: currentUser.displayName,
        photoURL:    currentUser.photoURL || '',
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    loadFriendsList();
    loadFriendRequests();
    setupChatTabListeners();

    btn.addEventListener('click', () => {
        const panel = document.getElementById('chatPanel');
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
            totalUnread = 0;
            updateUnreadBadge();
        }
    });

    document.getElementById('closeChatPanel').addEventListener('click', () => {
        document.getElementById('chatPanel').classList.add('hidden');
    });

    document.getElementById('sendFriendReqBtn').addEventListener('click', sendFriendRequest);
    document.getElementById('addFriendEmail').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendFriendRequest();
    });
}

function setupChatTabListeners() {
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.chat-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab' + capitalize(tab.dataset.tab)).classList.add('active');
        });
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ------ FRIEND REQUESTS ------

async function sendFriendRequest() {
    const emailInput = document.getElementById('addFriendEmail');
    const statusEl   = document.getElementById('addFriendStatus');
    const email      = emailInput.value.trim().toLowerCase();

    if (!email) { setAddStatus('Vui lòng nhập email', 'error'); return; }
    if (email === currentUser.email.toLowerCase()) { setAddStatus('Không thể thêm chính mình', 'error'); return; }

    setAddStatus('Đang tìm kiếm...', 'info');

    try {
        const snap = await db.collection('users').where('email', '==', email).limit(1).get();
        if (snap.empty) { setAddStatus('Không tìm thấy người dùng với email này', 'error'); return; }

        const targetUser = snap.docs[0].data();
        const targetUid  = targetUser.uid;

        // Check if already friends
        const existingFriend = await db.collection('friends').doc(currentUser.uid).collection('list').doc(targetUid).get();
        if (existingFriend.exists) { setAddStatus('Đã là bạn bè rồi!', 'error'); return; }

        // Check if request already sent
        const existingReq = await db.collection('friendRequests').doc(targetUid).collection('incoming').doc(currentUser.uid).get();
        if (existingReq.exists) { setAddStatus('Đã gửi lời mời rồi!', 'error'); return; }

        // Send request
        await db.collection('friendRequests').doc(targetUid).collection('incoming').doc(currentUser.uid).set({
            fromUid:     currentUser.uid,
            fromEmail:   currentUser.email,
            fromName:    currentUser.displayName,
            fromPhoto:   currentUser.photoURL || '',
            sentAt:      firebase.firestore.FieldValue.serverTimestamp()
        });

        setAddStatus(`✅ Đã gửi lời mời tới ${targetUser.displayName || email}`, 'success');
        emailInput.value = '';
    } catch (err) {
        console.error(err);
        setAddStatus('Lỗi khi gửi lời mời', 'error');
    }
}

function setAddStatus(msg, type) {
    const el = document.getElementById('addFriendStatus');
    el.textContent  = msg;
    el.className    = 'add-friend-status ' + type;
}

function loadFriendRequests() {
    const unsub = db.collection('friendRequests').doc(currentUser.uid).collection('incoming')
        .orderBy('sentAt', 'desc')
        .onSnapshot(snap => {
            friendRequests = snap.docs.map(d => d.data());
            renderFriendRequests();
        });
    chatUnsubscribers.push(unsub);
}

function renderFriendRequests() {
    const container = document.getElementById('requestsList');
    const badge     = document.getElementById('reqBadge');

    if (friendRequests.length > 0) {
        badge.textContent = friendRequests.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (!friendRequests.length) {
        container.innerHTML = `<div class="empty-chat">Không có lời mời nào</div>`;
        return;
    }

    container.innerHTML = friendRequests.map(req => `
        <div class="friend-request-item">
            <div class="friend-avatar" style="background-image:url('${req.fromPhoto}');"></div>
            <div class="friend-info">
                <div class="friend-name">${req.fromName || req.fromEmail}</div>
                <div class="friend-email">${req.fromEmail}</div>
            </div>
            <div class="req-actions">
                <button class="req-accept-btn" onclick="acceptFriendRequest('${req.fromUid}','${req.fromName}','${req.fromEmail}','${req.fromPhoto}')">✓</button>
                <button class="req-decline-btn" onclick="declineFriendRequest('${req.fromUid}')">✕</button>
            </div>
        </div>
    `).join('');
}

async function acceptFriendRequest(fromUid, fromName, fromEmail, fromPhoto) {
    try {
        const batch = db.batch();

        // Add to my friends list
        batch.set(db.collection('friends').doc(currentUser.uid).collection('list').doc(fromUid), {
            uid:         fromUid,
            displayName: fromName,
            email:       fromEmail,
            photoURL:    fromPhoto,
            addedAt:     firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add me to their friends list
        batch.set(db.collection('friends').doc(fromUid).collection('list').doc(currentUser.uid), {
            uid:         currentUser.uid,
            displayName: currentUser.displayName,
            email:       currentUser.email,
            photoURL:    currentUser.photoURL || '',
            addedAt:     firebase.firestore.FieldValue.serverTimestamp()
        });

        // Delete the request
        batch.delete(db.collection('friendRequests').doc(currentUser.uid).collection('incoming').doc(fromUid));

        await batch.commit();
        showToast(`✅ Đã chấp nhận kết bạn với ${fromName}`);
    } catch (err) {
        console.error(err);
        showToast('Lỗi khi chấp nhận lời mời');
    }
}

async function declineFriendRequest(fromUid) {
    try {
        await db.collection('friendRequests').doc(currentUser.uid).collection('incoming').doc(fromUid).delete();
        showToast('Đã từ chối lời mời');
    } catch (err) {
        console.error(err);
    }
}

// ------ FRIENDS LIST ------

function loadFriendsList() {
    const unsub = db.collection('friends').doc(currentUser.uid).collection('list')
        .orderBy('addedAt', 'desc')
        .onSnapshot(snap => {
            friendsList = snap.docs.map(d => d.data());
            renderFriendsList();
        });
    chatUnsubscribers.push(unsub);
}

function renderFriendsList() {
    const container = document.getElementById('friendsList');
    if (!friendsList.length) {
        container.innerHTML = `<div class="empty-chat">Chưa có bạn bè nào. Thêm bạn bè để bắt đầu chat!</div>`;
        return;
    }
    container.innerHTML = friendsList.map(friend => `
        <div class="friend-item" onclick="openChatWindow('${friend.uid}','${friend.displayName}','${friend.photoURL}','${friend.email}')">
            <div class="friend-avatar" style="background-image:url('${friend.photoURL}');"
                 onerror="this.style.backgroundImage='none';this.textContent='${(friend.displayName||'?')[0].toUpperCase()}'">
            </div>
            <div class="friend-info">
                <div class="friend-name">${friend.displayName || friend.email}</div>
                <div class="friend-email">${friend.email}</div>
            </div>
            <button class="friend-chat-btn" title="Mở chat">💬</button>
        </div>
    `).join('');
}

// ------ CHAT WINDOW ------

function getChatRoomId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

function openChatWindow(friendUid, friendName, friendPhoto, friendEmail) {
    // Close chat panel on mobile
    if (window.innerWidth < 768) {
        document.getElementById('chatPanel').classList.add('hidden');
    }

    if (openChatWindows[friendUid]) {
        openChatWindows[friendUid].classList.toggle('minimized');
        return;
    }

    const roomId  = getChatRoomId(currentUser.uid, friendUid);
    const winId   = 'cw_' + friendUid;
    const container = document.getElementById('chatWindowsContainer');

    // Offset windows so they don't stack perfectly
    const offset  = Object.keys(openChatWindows).length * 20;

    const win = document.createElement('div');
    win.className = 'chat-window';
    win.id        = winId;
    win.style.right  = (20 + offset) + 'px';
    win.style.bottom = (80 + offset) + 'px';

    win.innerHTML = `
        <div class="cw-header" onmousedown="startDragChatWindow(event, '${winId}')">
            <div class="cw-header-left">
                <div class="cw-avatar" style="background-image:url('${friendPhoto}')"></div>
                <span class="cw-name">${friendName || friendEmail}</span>
            </div>
            <div class="cw-header-actions">
                <button class="cw-btn" onclick="toggleMinimizeChatWindow('${friendUid}')" title="Thu nhỏ">—</button>
                <button class="cw-btn" onclick="closeChatWindow('${friendUid}')" title="Đóng">✕</button>
            </div>
        </div>
        <div class="cw-body" id="cwBody_${friendUid}">
            <div class="cw-loading">Đang tải tin nhắn...</div>
        </div>
        <div class="cw-footer">
            <input class="cw-input" id="cwInput_${friendUid}" type="text" placeholder="Nhắn tin..." autocomplete="off">
            <button class="cw-send-btn" onclick="sendChatMessage('${friendUid}','${roomId}')">➤</button>
        </div>
    `;

    container.appendChild(win);
    openChatWindows[friendUid] = win;

    // Enter key to send
    win.querySelector('.cw-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendChatMessage(friendUid, roomId);
    });

    // Listen to messages
    listenToMessages(friendUid, roomId);

    // Mark messages as read when window opened
    markMessagesRead(roomId);
}

function listenToMessages(friendUid, roomId) {
    const bodyEl = document.getElementById('cwBody_' + friendUid);

    const unsub = db.collection('chats').doc(roomId).collection('messages')
        .orderBy('sentAt', 'asc')
        .limitToLast(100)
        .onSnapshot(snap => {
            if (!snap) return;
            const msgs = snap.docs.map(d => d.data());
            renderMessages(bodyEl, msgs);
            markMessagesRead(roomId);
        });

    chatUnsubscribers.push(unsub);
}

function renderMessages(bodyEl, msgs) {
    if (!msgs.length) {
        bodyEl.innerHTML = `<div class="cw-empty">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</div>`;
        return;
    }

    bodyEl.innerHTML = msgs.map(msg => {
        const isMine = msg.senderUid === currentUser.uid;
        const time   = msg.sentAt?.toDate ? formatMsgTime(msg.sentAt.toDate()) : '';
        return `
            <div class="cw-msg ${isMine ? 'mine' : 'theirs'}">
                <div class="cw-bubble">${escapeHtml(msg.text)}</div>
                <div class="cw-time">${time}</div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    bodyEl.scrollTop = bodyEl.scrollHeight;
}

async function sendChatMessage(friendUid, roomId) {
    const input = document.getElementById('cwInput_' + friendUid);
    const text  = input.value.trim();
    if (!text) return;

    input.value = '';

    try {
        await db.collection('chats').doc(roomId).collection('messages').add({
            text:        text,
            senderUid:   currentUser.uid,
            senderName:  currentUser.displayName,
            senderPhoto: currentUser.photoURL || '',
            sentAt:      firebase.firestore.FieldValue.serverTimestamp(),
            readBy:      [currentUser.uid]
        });

        // Update last message metadata for notifications
        await db.collection('chats').doc(roomId).set({
            lastMessage:  text,
            lastSenderUid: currentUser.uid,
            lastSentAt:   firebase.firestore.FieldValue.serverTimestamp(),
            participants: [currentUser.uid, friendUid]
        }, { merge: true });

    } catch (err) {
        console.error('Send message error:', err);
        showToast('Lỗi gửi tin nhắn');
    }
}

async function markMessagesRead(roomId) {
    // lightweight: just update the chat room's readBy for current user
    try {
        await db.collection('chats').doc(roomId).set({
            [`readAt_${currentUser.uid}`]: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) { /* silent */ }
}

function closeChatWindow(friendUid) {
    const win = openChatWindows[friendUid];
    if (win) {
        win.remove();
        delete openChatWindows[friendUid];
    }
}

function toggleMinimizeChatWindow(friendUid) {
    const win = openChatWindows[friendUid];
    if (win) win.classList.toggle('minimized');
}

function updateUnreadBadge() {
    const badge = document.getElementById('chatUnreadBadge');
    if (totalUnread > 0) {
        badge.textContent = totalUnread > 9 ? '9+' : totalUnread;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ------ DRAG CHAT WINDOW ------

function startDragChatWindow(e, winId) {
    if (e.target.closest('button')) return;
    const win      = document.getElementById(winId);
    const startX   = e.clientX - win.getBoundingClientRect().left;
    const startY   = e.clientY - win.getBoundingClientRect().top;

    function onMove(e) {
        const newLeft = e.clientX - startX;
        const newTop  = e.clientY - startY;
        win.style.left   = newLeft + 'px';
        win.style.top    = newTop  + 'px';
        win.style.right  = 'auto';
        win.style.bottom = 'auto';
    }

    function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
}

// ------ HELPERS ------

function formatMsgTime(date) {
    const now   = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const hh    = String(date.getHours()).padStart(2, '0');
    const mm    = String(date.getMinutes()).padStart(2, '0');
    if (isToday) return `${hh}:${mm}`;
    return `${date.getDate()}/${date.getMonth()+1} ${hh}:${mm}`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Expose to inline HTML handlers
window.acceptFriendRequest  = acceptFriendRequest;
window.declineFriendRequest = declineFriendRequest;
window.openChatWindow       = openChatWindow;
window.closeChatWindow      = closeChatWindow;
window.toggleMinimizeChatWindow = toggleMinimizeChatWindow;
window.sendChatMessage      = sendChatMessage;
window.startDragChatWindow  = startDragChatWindow;
