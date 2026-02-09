/**
 * Application SIG Moderne - Logique principale
 * Fatick Region Administrative Mapping
 */

// ===== VARIABLES GLOBALES =====
let map, minimap;
let layers = {};
let basemaps = {};
let bounds_group = new L.featureGroup([]);
// NOTE: labels et totalMarkers sont déjà déclarés dans labels.js
let deferredPrompt; // Pour stocker l'événement d'installation PWA
let userLocationMarker = null; // Marqueur de position utilisateur

// ===== INITIALISATION PRINCIPALE =====
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('DOM ready: démarrage de l\'initialisation de l\'application SIG');

        // Initialiser la carte
        initializeMap();

        // Initialiser les panneaux
        initializePanels();

        // Initialiser les outils
        initializeTools();

        // Initialiser les écouteurs d'événements
        setupEventListeners();

        // Initialiser la logique PWA
        initPWA();

        // Forcer redimensionnement après un court délai
        setTimeout(function() {
            try { if (map) { map.invalidateSize(); console.log('map.invalidateSize() exécuté'); } }
            catch (e) { console.warn('invalidateSize failed', e); }
        }, 600);
    } catch (err) {
        console.error('Erreur lors de l\'initialisation DOMContentLoaded:', err);
    }
});

// ===== INITIALISATION DE LA CARTE =====
function initializeMap() {
    map = L.map('map', {
        zoomControl: false,
        maxZoom: 28,
        minZoom: 1
    });

    // Ajouter le contrôle hash
    var hash = new L.Hash(map);

    // Configuration attribution
    map.attributionControl.setPrefix(
        '<a href="https://github.com/tomchadwin/qgis2web" target="_blank">qgis2web</a> &middot; ' +
        '<a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; ' +
        '<a href="https://qgis.org">QGIS</a>'
    );

    // Initialiser les fonds de carte
    initializeBasemaps();
    
    // Initialiser les couches
    initializeLayers();
    
    // Définir les limites
    setBounds();
}

// ===== INITIALISATION DES FONDS DE CARTE =====
function initializeBasemaps() {
    console.log('initializeBasemaps()');
    // CartoDb Dark Matter
    basemaps.cartoDb = L.tileLayer(
        'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        {
            opacity: 1.0,
            minZoom: 1,
            maxZoom: 28,
            minNativeZoom: 0,
            maxNativeZoom: 20,
            attribution: '© CartoDB contributors'
        }
    );

    // Google Satellite Hybrid
    basemaps.googleSatellite = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
            opacity: 1.0,
            minZoom: 1,
            maxZoom: 28,
            minNativeZoom: 0,
            maxNativeZoom: 19,
            attribution: '© Google'
        }
    );

    // OpenStreetMap
    basemaps.osm = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            opacity: 1.0,
            minZoom: 1,
            maxZoom: 28,
            minNativeZoom: 0,
            maxNativeZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }
    );

    // Ajouter le basemap par défaut
    basemaps.osm.addTo(map);
    console.log('Basemap par défaut ajouté');

    // Ajouter le contrôle des basemaps
    const basemapControl = L.control.layers(
        {
            'OpenStreetMap': basemaps.osm,
            'Google Satellite': basemaps.googleSatellite,
            'CartoDB Dark': basemaps.cartoDb
        },
        null,
        { position: 'topright' }
    );
    // Ne pas ajouter ici, sera géré par le panneau droit
}

// Forcer un invalidateSize pour s'assurer que la carte s'affiche
setTimeout(function() {
    try { if (map) map.invalidateSize(); } catch (e) {}
}, 500);

// ===== INITIALISATION DES COUCHES =====
function initializeLayers() {
    var autolinker = new Autolinker({ truncate: { length: 30, location: 'smart' } });

    // Configuration communes
    const commonOptions = {
        autolinker: autolinker,
        highlightLayer: null
    };

    // Région
    createLayerPane('pane_Region_3', 403);
    layers.region = L.geoJson(json_Region_3, {
        attribution: '',
        interactive: true,
        pane: 'pane_Region_3',
        onEachFeature: (feature, layer) => popupHandler(feature, layer, autolinker),
        style: () => ({
            pane: 'pane_Region_3',
            opacity: 1,
            color: 'rgba(251,35,35,1.0)',
            dashArray: '',
            lineCap: 'butt',
            lineJoin: 'miter',
            weight: 2.0,
            fillOpacity: 0,
            interactive: true,
        })
    });
    bounds_group.addLayer(layers.region);
    map.addLayer(layers.region);

    // Département
    createLayerPane('pane_Departement_4', 404);
    layers.departement = L.geoJson(json_Departement_4, {
        attribution: '',
        interactive: true,
        pane: 'pane_Departement_4',
        onEachFeature: (feature, layer) => popupHandler(feature, layer, autolinker),
        style: (feature) => getDepartementStyle(feature)
    });
    bounds_group.addLayer(layers.departement);
    map.addLayer(layers.departement);

    // Arrondissement
    createLayerPane('pane_Arrondissement_5', 405);
    layers.arrondissement = L.geoJson(json_Arrondissement_5, {
        attribution: '',
        interactive: true,
        pane: 'pane_Arrondissement_5',
        onEachFeature: (feature, layer) => popupHandler(feature, layer, autolinker),
        style: () => ({
            pane: 'pane_Arrondissement_5',
            opacity: 1,
            color: 'rgba(35,35,35,1.0)',
            dashArray: '',
            lineCap: 'butt',
            lineJoin: 'miter',
            weight: 2.0,
            fillOpacity: 0,
            interactive: true,
        })
    });
    bounds_group.addLayer(layers.arrondissement);
    map.addLayer(layers.arrondissement);

    // Route
    createLayerPane('pane_Route_6', 406);
    layers.route = L.geoJson(json_Route_6, {
        attribution: '',
        interactive: false,
        pane: 'pane_Route_6',
        onEachFeature: (feature, layer) => popupHandler(feature, layer, autolinker),
        style: (feature) => getRouteStyle(feature)
    });
    bounds_group.addLayer(layers.route);
    map.addLayer(layers.route);

    // Localité
    createLayerPane('pane_Localite_7', 407);
    layers.localite = L.geoJson(json_Localite_7, {
        attribution: '',
        interactive: true,
        pane: 'pane_Localite_7',
        onEachFeature: (feature, layer) => {
            popupHandler(feature, layer, autolinker);
            // Afficher le nom de la localité
            const label = feature.properties['NOM'] || feature.properties['Nom'] || feature.properties['nom'] || feature.properties['NAME'] || feature.properties['Name'];
            if (label) {
                layer.bindTooltip(String(label), {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -5],
                    className: 'leaflet-tooltip-localite'
                });
            }
        },
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            pane: 'pane_Localite_7',
            radius: 4.0,
            opacity: 1,
            color: 'rgba(35,35,35,1.0)',
            weight: 1,
            fill: true,
            fillOpacity: 1,
            fillColor: 'rgba(141,90,153,1.0)',
            interactive: true,
        })
    });
    layers.localiteCluster = new L.MarkerClusterGroup({ showCoverageOnHover: false, spiderfyDistanceMultiplier: 2 });
    layers.localiteCluster.addLayer(layers.localite);
    bounds_group.addLayer(layers.localite);
    layers.localiteCluster.addTo(map);

    // École
    createLayerPane('pane_Ecole_8', 408);
    layers.ecole = L.geoJson(json_Ecole_8, {
        attribution: '',
        interactive: true,
        pane: 'pane_Ecole_8',
        onEachFeature: (feature, layer) => {
            popupHandler(feature, layer, autolinker);
            // Afficher le nom de l'école
            const label = feature.properties['NOM'] || feature.properties['Nom'] || feature.properties['nom'] || feature.properties['NAME'] || feature.properties['Name'];
            if (label) {
                layer.bindTooltip(String(label), {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -5],
                    className: 'leaflet-tooltip-localite'
                });
            }
        },
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            pane: 'pane_Ecole_8',
            radius: 4.0,
            opacity: 1,
            color: 'rgba(35,35,35,1.0)',
            weight: 1,
            fill: true,
            fillOpacity: 1,
            fillColor: 'rgba(232,113,141,1.0)',
            interactive: true,
        })
    });
    layers.ecoleCluster = new L.MarkerClusterGroup({ showCoverageOnHover: false, spiderfyDistanceMultiplier: 2 });
    layers.ecoleCluster.addLayer(layers.ecole);
    bounds_group.addLayer(layers.ecole);
    layers.ecoleCluster.addTo(map);

    // Créer un contrôle de couches personnalisé pour le panneau droit
    updateLayersPanel();
}

// ===== INITIALISATION DES PANNEAUX =====
function initializePanels() {
    // Remplir les panneaux existants si présents, sinon les créer
    const leftContent = document.getElementById('left-panel-content');
    if (leftContent) {
        populateLayersPanel(leftContent);
    } else {
        const layersPanel = createPanel('left', 'Couches', 'layers');
        populateLayersPanel(layersPanel);
    }

    const rightContent = document.getElementById('right-panel-content');
    if (rightContent) {
        populateBasemapsPanel(rightContent);
    } else {
        const rightPanel = createPanel('right', 'Cartes de Base', 'globe');
        populateBasemapsPanel(rightPanel);
    }
}

// ===== CRÉATION D'UN PANNEAU =====
function createPanel(position, title, icon) {
    const panel = document.createElement('div');
    panel.className = `side-panel ${position}-panel`;
    panel.id = `${position}-panel`;
    panel.innerHTML = `
        <div class="panel-header">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${icon}"></i>
                <h3>${title}</h3>
            </div>
            <button class="panel-close-btn" onclick="togglePanel('${position}')">
                <i class="fas fa-chevron-${position === 'left' ? 'left' : 'right'}"></i>
            </button>
        </div>
        <div class="panel-content" id="${position}-panel-content"></div>
    `;

    document.getElementById('map-container').appendChild(panel);
    return document.getElementById(`${position}-panel-content`);
}

// ===== REMPLIR LE PANNEAU DES COUCHES =====
function populateLayersPanel(container) {
    container.innerHTML = `
        <div class="layers-section">
            <div class="layers-title">Couches</div>
            <div class="layer-item">
                <input type="checkbox" id="layer-localite" checked onchange="toggleLayer('localite')">
                <label for="layer-localite">Localités</label>
            </div>
            <div class="layer-item">
                <input type="checkbox" id="layer-ecole" checked onchange="toggleLayer('ecole')">
                <label for="layer-ecole">Écoles</label>
            </div>
            <div class="layer-item">
                <input type="checkbox" id="layer-route" checked onchange="toggleLayer('route')">
                <label for="layer-route">Routes</label>
            </div>
            <div class="layer-item">
                <input type="checkbox" id="layer-arrondissement" checked onchange="toggleLayer('arrondissement')">
                <label for="layer-arrondissement">Arrondissements</label>
            </div>
            <div class="layer-item">
                <input type="checkbox" id="layer-departement" checked onchange="toggleLayer('departement')">
                <label for="layer-departement">Départements</label>
            </div>
            <div class="layer-item">
                <input type="checkbox" id="layer-region" checked onchange="toggleLayer('region')">
                <label for="layer-region">Région</label>
            </div>
        </div>
    `;
}

// ===== REMPLIR LE PANNEAU DES FOND DE CARTE =====
function populateBasemapsPanel(container) {
    console.log('populateBasemapsPanel() called, container:', container);
    container.innerHTML = `
        <div class="panel-tabs" style="display: flex; border-bottom: 1px solid #ddd; margin-bottom: 10px;">
            <button class="tab-btn active" onclick="switchRightPanelTab('basemaps')" style="flex: 1; padding: 10px; border: none; background: none; cursor: pointer; border-bottom: 2px solid #1e5a96; font-weight: bold; color: #333;">Fond de Carte</button>
            <button class="tab-btn" onclick="switchRightPanelTab('legend')" style="flex: 1; padding: 10px; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #666;">Légende</button>
        </div>
        
        <div id="basemaps-content" class="tab-content">
            <div class="layers-section">
                <div class="layer-item">
                    <input type="radio" id="basemap-osm" name="basemap" value="osm" checked onchange="changeBasemap('osm')">
                    <label for="basemap-osm">OpenStreetMap</label>
                </div>
                <div class="layer-item">
                    <input type="radio" id="basemap-satellite" name="basemap" value="googleSatellite" onchange="changeBasemap('googleSatellite')">
                    <label for="basemap-satellite">Google Satellite Hybrid</label>
                </div>
                <div class="layer-item">
                    <input type="radio" id="basemap-cartodb" name="basemap" value="cartoDb" onchange="changeBasemap('cartoDb')">
                    <label for="basemap-cartodb">CartoDB Dark</label>
                </div>
            </div>
        </div>

        <div id="legend-tab-content" class="tab-content" style="display: none;">
            <div class="layers-section">
                <div id="legend-content" style="padding: 10px; font-size: 12px;"></div>
            </div>
        </div>
    `;
    
    // Ajouter la légende
    try {
        updateLegend();
    } catch (e) {
        console.warn('updateLegend failed in populateBasemapsPanel:', e);
    }
}

// Fonction pour changer d'onglet dans le panneau droit
window.switchRightPanelTab = function(tabName) {
    const basemapsContent = document.getElementById('basemaps-content');
    const legendContent = document.getElementById('legend-tab-content');
    const tabs = document.querySelectorAll('.panel-tabs .tab-btn');
    
    if (tabName === 'basemaps') {
        basemapsContent.style.display = 'block';
        legendContent.style.display = 'none';
        
        tabs[0].style.borderBottomColor = '#1e5a96';
        tabs[0].style.fontWeight = 'bold';
        tabs[0].style.color = '#333';
        
        tabs[1].style.borderBottomColor = 'transparent';
        tabs[1].style.fontWeight = 'normal';
        tabs[1].style.color = '#666';
    } else {
        basemapsContent.style.display = 'none';
        legendContent.style.display = 'block';
        
        tabs[0].style.borderBottomColor = 'transparent';
        tabs[0].style.fontWeight = 'normal';
        tabs[0].style.color = '#666';
        
        tabs[1].style.borderBottomColor = '#1e5a96';
        tabs[1].style.fontWeight = 'bold';
        tabs[1].style.color = '#333';
    }
};

// ===== FONCTIONS DES COUCHES =====
function toggleLayer(layerName) {
    const checkbox = document.getElementById('layer-' + layerName);
    if (!checkbox) {
        return;
    }

    // La couche à activer/désactiver est soit la version clusterisée, soit la version brute.
    const layer = layers[layerName + 'Cluster'] || layers[layerName];

    if (layer) {
        if (checkbox.checked) {
            map.addLayer(layer);
        } else {
            map.removeLayer(layer);
        }
    }
}

function updateLayersPanel() {
    // Mise à jour du panneau des couches
}

// ===== CHANGEMENT DU FOND DE CARTE =====
function changeBasemap(basemapName) {
    // Retirer tous les basemaps
    map.removeLayer(basemaps.osm);
    map.removeLayer(basemaps.googleSatellite);
    map.removeLayer(basemaps.cartoDb);

    // Ajouter le nouveau basemap
    basemaps[basemapName].addTo(map);
}

// ===== INITIALISATION DES OUTILS =====
function initializeTools() {
    // Titre de la carte
    const titleControl = L.control({ position: 'topleft' });
    titleControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-title-control');
        div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        div.style.padding = '8px 12px';
        div.style.borderRadius = '4px';
        div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
        div.style.marginBottom = '10px';
        div.innerHTML = '<h4 style="margin: 0; font-size: 16px; color: #333; font-weight: 700;">Cartographie web des limites administratives de la région de Fatick</h4>';
        return div;
    };
    titleControl.addTo(map);

    // Barre d'outils de la carte
    const mapToolbar = L.control({ position: 'topleft' });
    mapToolbar.onAdd = function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        L.DomEvent.disableClickPropagation(container);

        const createButton = (html, title, className, onClick) => {
            const button = L.DomUtil.create('a', className, container);
            button.href = '#';
            button.title = title;
            button.innerHTML = html;
            L.DomEvent.on(button, 'click', L.DomEvent.stop).on(button, 'click', (e) => {
                e.preventDefault();
                onClick();
            });
            return button;
        };

        createButton('+', 'Zoom avant', 'leaflet-control-zoom-in', () => map.zoomIn());
        createButton('-', 'Zoom arrière', 'leaflet-control-zoom-out', () => map.zoomOut());
        createButton('<i class="fas fa-home"></i>', 'Vue initiale', 'map-tool-btn', () => {
            if (bounds_group.getLayers().length) {
                map.fitBounds(bounds_group.getBounds());
            }
        });
        createButton('<i class="fas fa-location-arrow"></i>', 'Me localiser', 'map-tool-btn', () => window.locateControl.start());
        createButton('<i class="fas fa-ruler"></i>', 'Outil de mesure', 'map-tool-btn', () => window.measureControl._startMeasure());

        return container;
    };
    mapToolbar.addTo(map);

    // Recherche Photon
    L.control.photon({
        position: 'topleft',
        placeholder: 'Rechercher un lieu...',
        lang: 'fr'
    }).addTo(map);


    // Locate control (stockée pour usage depuis la barre d'outils)
    window.locateControl = L.control.locate({ locateOptions: { maxZoom: 19 } }).addTo(map);

    // Measure control (stockée globalement)
    window.measureControl = new L.Control.Measure({
        position: 'topleft',
        primaryLengthUnit: 'meters',
        secondaryLengthUnit: 'kilometers',
        primaryAreaUnit: 'sqmeters',
        secondaryAreaUnit: 'hectares'
    });
    window.measureControl.addTo(map);
    try {
        const measureToggle = document.getElementsByClassName('leaflet-control-measure-toggle')[0];
        if (measureToggle) {
            measureToggle.innerHTML = '';
            measureToggle.className += ' fas fa-ruler';
        }
    } catch (err) {}

    // Scale control
    L.control.scale({ position: 'bottomleft' }).addTo(map);

    // Initialiser la mini-map
    initializeMinimap();

    // Initialiser la barre de coordonnées
    updateCoordinatesBar();
    map.on('mousemove', updateCoordinatesBar);
}

// ===== INITIALISER LA MINI-MAP =====
// ===== INITIALISER LA MINI-MAP =====
function initializeMinimap() {
    if (!document.getElementById('minimap')) {
        console.warn('Mini-map container not found');
        return;
    }
    
    try {
        const offset = 4;
        const initialZoom = Math.max(0, map.getZoom() - offset);

        minimap = new L.Map('minimap', {
            layers: [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png')],
            center: map.getCenter(),
            zoom: initialZoom,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false
        });

        // Ajouter un rectangle pour montrer l'étendue de la carte principale
        const rect = L.rectangle(map.getBounds(), { color: '#1e5a96', weight: 1.5, fill: true, fillOpacity: 0.1 }).addTo(minimap);

        map.on('move', function() {
            rect.setBounds(map.getBounds());
            minimap.setView(map.getCenter(), Math.max(0, map.getZoom() - offset));
        });
    } catch (e) {
        console.error('Error initializing minimap:', e);
    }
}

// ===== METTRE À JOUR LA BARRE DE COORDONNÉES =====
function updateCoordinatesBar(e) {
    try {
        let coords;
        if (e && e.latlng) {
            // Appelé depuis un événement mousemove
            coords = e.latlng;
        } else if (e && e.originalEvent) {
            // Convertir depuis le point souris
            coords = map.mouseEventToLatLng(e.originalEvent);
        } else {
            // Valeurs par défaut si pas d'événement
            coords = { lat: 0, lng: 0 };
        }
        
        if (coords) {
            const latElem = document.getElementById('coord-lat');
            const lngElem = document.getElementById('coord-lng');
            if (latElem) latElem.textContent = coords.lat.toFixed(4);
            if (lngElem) lngElem.textContent = coords.lng.toFixed(4);
        }

        // Mettre à jour l'échelle
        const zoom = map.getZoom();
        const scale = 40075017 / (256 * Math.pow(2, zoom));
        const pixelsPerMeter = 256 / scale;
        const scaleElem = document.getElementById('scale-info');
        const zoomElem = document.getElementById('zoom-level');
        if (scaleElem) scaleElem.textContent = (pixelsPerMeter * 100).toFixed(1) + ' m/px';
        if (zoomElem) zoomElem.textContent = zoom;
    } catch (error) {
        console.warn('Error updating coordinates bar:', error);
    }
}

// ===== GESTIONNAIRE DE POPUP =====
function popupHandler(feature, layer, autolinker) {
    layer.on({
        mouseout: function(e) {
            for (var i in e.target._eventParents) {
                if (typeof e.target._eventParents[i].resetStyle === 'function') {
                    e.target._eventParents[i].resetStyle(e.target);
                }
            }
            if (typeof layer.closePopup == 'function') {
                layer.closePopup();
            } else {
                layer.eachLayer(function(feature) {
                    feature.closePopup()
                });
            }
        },
        mouseover: highlightFeature
    });

    const popupContent = buildPopupContent(feature);
    layer.bindPopup(popupContent, { maxHeight: 400 });
}

function highlightFeature(e) {
    const layer = e.target;
    if (e.target.feature.geometry.type === 'LineString' || e.target.feature.geometry.type === 'MultiLineString') {
        layer.setStyle({
            color: 'rgba(255, 255, 0, 1.00)',
        });
    } else {
        layer.setStyle({
            fillColor: 'rgba(255, 255, 0, 1.00)',
            fillOpacity: 1
        });
    }
    layer.openPopup();
}

function buildPopupContent(feature) {
    let content = '<table style="width: 100%; border-collapse: collapse;">';
    for (let prop in feature.properties) {
        if (feature.properties[prop] !== null) {
            content += `<tr><th>${prop}:</th><td>${feature.properties[prop]}</td></tr>`;
        }
    }
    content += '</table>';
    return content;
}

// ===== STYLES DES COUCHES =====
function getDepartementStyle(feature) {
    const styles = {
        'FATICK': { fillColor: 'rgba(7,247,202,1.0)' },
        'FOUNDIOUGNE': { fillColor: 'rgba(247,164,8,1.0)' },
        'GOSSAS': { fillColor: 'rgba(247,109,81,1.0)' }
    };

    const style = styles[feature.properties['dept']] || {};
    return {
        pane: 'pane_Departement_4',
        opacity: 1,
        color: 'rgba(35,35,35,1.0)',
        dashArray: '',
        lineCap: 'butt',
        lineJoin: 'miter',
        weight: 1.0,
        fill: true,
        fillOpacity: 1,
        interactive: true,
        ...style
    };
}

function getRouteStyle(feature) {
    const styles = {
        'Autres pistes': { color: 'rgba(83,83,83,1.0)', weight: 3.0 },
        'Autres routes': { color: 'rgba(1,0,0,1.0)', weight: 1.0 },
        'Piste automobile': { color: 'rgba(172,91,49,1.0)', weight: 1.0 },
        'Chemin de fer': { color: 'rgba(0,0,0,1.0)', weight: 2.0 },
        'Route principale': { color: 'rgba(0,0,0,1.0)', weight: 3.0 },
        'Route principale à 2 voies': { color: 'rgba(0,0,0,1.0)', weight: 3.0 }
    };

    const style = styles[feature.properties['FONCTION']] || {};
    return {
        pane: 'pane_Route_6',
        opacity: 1,
        dashArray: '',
        lineCap: 'round',
        lineJoin: 'round',
        fillOpacity: 0,
        interactive: false,
        ...style
    };
}

// ===== FONCTIONS UTILITAIRES =====
function createLayerPane(paneName, zIndex) {
    if (!map.getPane(paneName)) {
        map.createPane(paneName);
        map.getPane(paneName).style.zIndex = zIndex;
        map.getPane(paneName).style['mix-blend-mode'] = 'normal';
    }
}

function setBounds() {
    if (bounds_group.getLayers().length) {
        map.fitBounds(bounds_group.getBounds());
        // Assurer que Leaflet recalcul la taille après ajustement des panneaux
        setTimeout(function() { try { map.invalidateSize(); } catch (e){} }, 250);
    }
}

function updateLegend() {
    try {
        const legendContent = document.getElementById('legend-content');
        if (legendContent) {
            legendContent.innerHTML = `
                <p><strong>Légende</strong></p>
                <ul style="list-style: none; padding: 0; margin: 0; margin-top: 10px;">
                    <li style="display: flex; align-items: center; margin-bottom: 5px;">
                        <span style="background-color: rgba(141,90,153,1.0); border-radius: 50%; width: 10px; height: 10px; display: inline-block; margin-right: 8px; border: 1px solid #fff;"></span> 
                        <span>Localités</span>
                    </li>
                    <li style="display: flex; align-items: center; margin-bottom: 5px;">
                        <span style="background-color: rgba(232,113,141,1.0); border-radius: 50%; width: 10px; height: 10px; display: inline-block; margin-right: 8px; border: 1px solid #fff;"></span> 
                        <span>Écoles</span>
                    </li>
                    <li style="margin-bottom: 5px; margin-top: 10px;">
                        <strong>Routes</strong>
                        <ul style="list-style: none; padding-left: 15px; margin-top: 5px;">
                            <li style="display: flex; align-items: center; margin-bottom: 5px;"><span style="border-top: 3px solid rgba(83,83,83,1.0); width: 20px; display: inline-block; margin-right: 8px;"></span><span>Autres pistes</span></li>
                            <li style="display: flex; align-items: center; margin-bottom: 5px;"><span style="border-top: 1px solid rgba(1,0,0,1.0); width: 20px; display: inline-block; margin-right: 8px;"></span><span>Autres routes</span></li>
                            <li style="display: flex; align-items: center; margin-bottom: 5px;"><span style="border-top: 1px solid rgba(172,91,49,1.0); width: 20px; display: inline-block; margin-right: 8px;"></span><span>Piste automobile</span></li>
                            <li style="display: flex; align-items: center; margin-bottom: 5px;"><span style="border-top: 2px solid rgba(0,0,0,1.0); width: 20px; display: inline-block; margin-right: 8px;"></span><span>Chemin de fer</span></li>
                            <li style="display: flex; align-items: center; margin-bottom: 5px;"><span style="border-top: 3px solid rgba(0,0,0,1.0); width: 20px; display: inline-block; margin-right: 8px;"></span><span>Route principale</span></li>
                        </ul>
                    </li>
                    <li style="display: flex; align-items: center; margin-bottom: 5px; margin-top: 10px;">
                        <span style="border: 2px solid rgba(35,35,35,1.0); width: 15px; height: 15px; display: inline-block; margin-right: 8px; background-color: transparent;"></span> 
                        <span>Arrondissements</span>
                    </li>
                    <li style="margin-bottom: 5px; margin-top: 10px;">
                        <strong>Départements</strong>
                        <ul style="list-style: none; padding-left: 15px; margin-top: 5px;">
                            <li style="display: flex; align-items: center; margin-bottom: 5px;">
                                <span style="background-color: rgba(7,247,202,1.0); border: 1px solid #333; width: 15px; height: 15px; display: inline-block; margin-right: 8px;"></span>
                                <span>Fatick</span>
                            </li>
                            <li style="display: flex; align-items: center; margin-bottom: 5px;">
                                <span style="background-color: rgba(247,164,8,1.0); border: 1px solid #333; width: 15px; height: 15px; display: inline-block; margin-right: 8px;"></span>
                                <span>Foundiougne</span>
                            </li>
                            <li style="display: flex; align-items: center; margin-bottom: 5px;">
                                <span style="background-color: rgba(247,109,81,1.0); border: 1px solid #333; width: 15px; height: 15px; display: inline-block; margin-right: 8px;"></span>
                                <span>Gossas</span>
                            </li>
                        </ul>
                    </li>
                    <li style="display: flex; align-items: center; margin-bottom: 5px; margin-top: 10px;">
                        <span style="border: 2px solid rgba(251,35,35,1.0); width: 15px; height: 15px; display: inline-block; margin-right: 8px; background-color: transparent;"></span> 
                        <span>Région</span>
                    </li>
                </ul>
            `;
        } else {
            console.warn('updateLegend: element #legend-content introuvable');
        }
    } catch (e) {
        console.error('updateLegend error:', e);
    }
}

// ===== PANNEAUX DYNAMIQUES =====
function togglePanel(position) {
    const panel = document.getElementById(`${position}-panel`);
    panel.classList.toggle('collapsed');
    // Gestion spécifique mobile (utilise la classe .show définie dans le CSS media query)
    panel.classList.toggle('show');
}

window.toggleMobileMenu = function() {
    const menu = document.querySelector('.navbar-menu');
    menu.classList.toggle('active');
}

// ===== PARAMÈTRES D'ÉVÉNEMENTS =====
function setupEventListeners() {
    // Remplir le menu de téléchargement
    populateDownloadMenu();

    // Fermer les modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('show');
        });
    });
}

// ===== MODALES =====
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ===== EXPORT DE DONNÉES =====
function populateDownloadMenu() {
    const menu = document.getElementById('download-menu');
    if (!menu) return;

    menu.innerHTML = ''; // Vider le contenu précédent

    const layerFriendlyNames = {
        localite: 'Localités',
        ecole: 'Écoles',
        route: 'Routes',
        arrondissement: 'Arrondissements',
        departement: 'Départements',
        region: 'Région'
    };

    let content = '';
    for (const layerName in layerFriendlyNames) {
        if (layers[layerName]) {
            content += `<div style="padding: 8px 20px; font-weight: bold; background-color: #f0f0f0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;">${layerFriendlyNames[layerName]}</div>`;
            content += `<button onclick="exportToGeoJSON('${layerName}')" style="display: block; width: 100%; padding: 10px 20px; text-align: left; border: none; background: none; cursor: pointer; border-bottom: 1px solid #f0f0f0;">
                            <i class="fas fa-file-code"></i> GeoJSON
                        </button>`;
            content += `<button onclick="exportToCSV('${layerName}')" style="display: block; width: 100%; padding: 10px 20px; text-align: left; border: none; background: none; cursor: pointer; border-bottom: 1px solid #ddd;">
                            <i class="fas fa-file-csv"></i> CSV
                        </button>`;
        }
    }
    menu.innerHTML = content;
}

window.exportToGeoJSON = function(layerName) {
    if (!layerName || !layers[layerName]) {
        alert('Veuillez sélectionner une couche valide.');
        return;
    }

    const layer = layers[layerName];
    const data = layer.toGeoJSON();
    // Use pretty print for better readability
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", layerName + ".geojson");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    document.getElementById('download-menu').style.display = 'none';
}

window.exportToCSV = function(layerName) {
    if (!layerName || !layers[layerName]) {
        alert('Veuillez sélectionner une couche valide.');
        return;
    }

    const layer = layers[layerName];
    const geojsonData = layer.toGeoJSON();
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
        alert('La couche sélectionnée ne contient aucune donnée à exporter.');
        return;
    }

    const items = geojsonData.features;
    
    let header = Object.keys(items[0].properties);
    const isPoint = items[0].geometry && items[0].geometry.type === 'Point';
    if (isPoint) {
        header.push('longitude', 'latitude');
    }

    let csvRows = items.map(row => {
        return header.map(fieldName => {
            if (fieldName === 'longitude' && isPoint) return row.geometry.coordinates[0];
            if (fieldName === 'latitude' && isPoint) return row.geometry.coordinates[1];
            
            // Handle potential commas and quotes in data
            const value = String(row.properties[fieldName] === null || row.properties[fieldName] === undefined ? '' : row.properties[fieldName]);
            const escaped = value.replace(/"/g, '""'); // escape double quotes
            return `"${escaped}"`; // wrap everything in double quotes
        }).join(',');
    });

    csvRows.unshift(header.join(',')); // Add header row
    const csvString = csvRows.join('\r\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", layerName + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.getElementById('download-menu').style.display = 'none';
}

// ===== IMPRESSION =====
function printMap() {
    window.print();
}

// ===== RECHERCHE RAPIDE =====
function quickSearch() {
    const searchTerm = document.getElementById('search-input').value;
    console.log('Recherche rapide:', searchTerm);
    // Implémenter la logique de recherche rapide
}

// ===== GÉOLOCALISATION STYLE GOOGLE MAPS =====
window.locateUser = function() {
    const btn = document.getElementById('gps-btn');
    
    if (!navigator.geolocation) {
        alert("La géolocalisation n'est pas supportée par votre navigateur.");
        return;
    }

    btn.classList.add('active'); // Change la couleur de l'icône
    
    map.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true
    });
};

// Écouteurs d'événements Leaflet pour la localisation
function setupLocationEvents() {
    map.on('locationfound', function(e) {
        const radius = e.accuracy / 2;

        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
        }

        // Créer un marqueur style "point bleu"
        userLocationMarker = L.circleMarker(e.latlng, {
            radius: 8,
            fillColor: '#4285F4',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);
        
        // Cercle de précision
        L.circle(e.latlng, radius, {
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.15,
            weight: 1
        }).addTo(map);
    });

    map.on('locationerror', function(e) {
        alert("Impossible de vous localiser : " + e.message);
        document.getElementById('gps-btn').classList.remove('active');
    });
}

// ===== PWA INSTALLATION =====
function initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Afficher le bouton d'installation
        const installBtn = document.getElementById('install-container');
        if (installBtn) installBtn.style.display = 'block';
    });
}

window.installPWA = function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('L\'utilisateur a accepté l\'installation A2HS');
        }
        deferredPrompt = null;
        document.getElementById('install-container').style.display = 'none';
    });
};

// Rendre les fonctions de togglePanel accessibles globalement
window.togglePanel = togglePanel;
window.toggleLayer = toggleLayer;
window.changeBasemap = changeBasemap;

// Ajouter l'initialisation des événements de localisation à la fin de initializeMap ou setupEventListeners
const originalSetupEventListeners = setupEventListeners;
setupEventListeners = function() {
    originalSetupEventListeners();
    setupLocationEvents();
};
