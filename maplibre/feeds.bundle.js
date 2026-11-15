var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/layers/bikeshare/registry.js
var registry_exports = {};
__export(registry_exports, {
  CITY_BY_ID: () => CITY_BY_ID,
  GBFS_CITY_REGISTRY: () => GBFS_CITY_REGISTRY
});
function buildBcycleUrls(systemId) {
  return {
    stationInformationUrl: `https://gbfs.bcycle.com/${systemId}/station_information.json`,
    stationStatusUrl: `https://gbfs.bcycle.com/${systemId}/station_status.json`
  };
}
function bcycleEntry({
  id,
  city,
  centerLat,
  centerLon,
  systemId,
  loadRadiusKm = 100,
  provider = "BCycle"
}) {
  return {
    id,
    city,
    centerLat,
    centerLon,
    loadRadiusKm,
    provider,
    ...buildBcycleUrls(systemId)
  };
}
function normalizeRegistryEntry(entry) {
  const id = String(entry?.id || "").trim().toLowerCase();
  const city = String(entry?.city || "").trim();
  const centerLat = Number(entry?.centerLat);
  const centerLon = Number(entry?.centerLon);
  const loadRadiusKm = Number(entry?.loadRadiusKm);
  const stationInformationUrl = new URL(
    String(entry?.stationInformationUrl || "").trim()
  );
  const stationStatusUrl = new URL(
    String(entry?.stationStatusUrl || "").trim()
  );
  if (!id) throw new Error("GBFS entry id is required");
  if (!city) throw new Error(`GBFS entry "${id}" city is required`);
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLon)) {
    throw new Error(`GBFS entry "${id}" has invalid center coordinates`);
  }
  if (stationInformationUrl.protocol !== "https:" || stationStatusUrl.protocol !== "https:") {
    throw new Error(`GBFS entry "${id}" must use https URLs`);
  }
  if (!/\/station_information\.json$/i.test(stationInformationUrl.pathname)) {
    throw new Error(`GBFS entry "${id}" station_information URL is invalid`);
  }
  if (!/\/station_status\.json$/i.test(stationStatusUrl.pathname)) {
    throw new Error(`GBFS entry "${id}" station_status URL is invalid`);
  }
  const hosts = Array.from(
    /* @__PURE__ */ new Set([
      stationInformationUrl.hostname.toLowerCase(),
      stationStatusUrl.hostname.toLowerCase()
    ])
  );
  return {
    id,
    city,
    centerLat,
    centerLon,
    loadRadiusKm: Number.isFinite(loadRadiusKm) && loadRadiusKm > 0 ? loadRadiusKm : CITY_RANGE_BASE_KM,
    stationInformationUrl: stationInformationUrl.toString(),
    stationStatusUrl: stationStatusUrl.toString(),
    provider: String(entry?.provider || "GBFS").trim() || "GBFS",
    hosts
  };
}
var RAW_GBFS_CITY_REGISTRY, GBFS_CITY_REGISTRY, CITY_BY_ID;
var init_registry = __esm({
  "src/layers/bikeshare/registry.js"() {
    RAW_GBFS_CITY_REGISTRY = [
      {
        id: "nyc-citibike",
        city: "New York, NY",
        centerLat: 40.7484,
        centerLon: -73.9967,
        loadRadiusKm: 140,
        stationInformationUrl: "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_information.json",
        stationStatusUrl: "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json",
        provider: "Citi Bike"
      },
      {
        id: "chicago-divvy",
        city: "Chicago, IL",
        centerLat: 41.8781,
        centerLon: -87.6298,
        loadRadiusKm: 120,
        stationInformationUrl: "https://gbfs.lyft.com/gbfs/2.3/chi/en/station_information.json",
        stationStatusUrl: "https://gbfs.lyft.com/gbfs/2.3/chi/en/station_status.json",
        provider: "Divvy"
      },
      {
        id: "dc-capital-bikeshare",
        city: "Washington, DC",
        centerLat: 38.9072,
        centerLon: -77.0369,
        loadRadiusKm: 120,
        stationInformationUrl: "https://gbfs.lyft.com/gbfs/2.3/dca-cabi/en/station_information.json",
        stationStatusUrl: "https://gbfs.lyft.com/gbfs/2.3/dca-cabi/en/station_status.json",
        provider: "Capital Bikeshare"
      },
      {
        id: "sf-bay-wheels",
        city: "San Francisco, CA",
        centerLat: 37.7749,
        centerLon: -122.4194,
        loadRadiusKm: 110,
        stationInformationUrl: "https://gbfs.lyft.com/gbfs/2.3/bay/en/station_information.json",
        stationStatusUrl: "https://gbfs.lyft.com/gbfs/2.3/bay/en/station_status.json",
        provider: "Bay Wheels"
      },
      {
        id: "boston-bluebikes",
        city: "Boston, MA",
        centerLat: 42.3601,
        centerLon: -71.0589,
        loadRadiusKm: 100,
        stationInformationUrl: "https://gbfs.bluebikes.com/gbfs/en/station_information.json",
        stationStatusUrl: "https://gbfs.bluebikes.com/gbfs/en/station_status.json",
        provider: "Blue Bikes"
      },
      {
        id: "philadelphia-indego",
        city: "Philadelphia, PA",
        centerLat: 39.9526,
        centerLon: -75.1652,
        loadRadiusKm: 100,
        stationInformationUrl: "https://gbfs.bcycle.com/bcycle_indego/station_information.json",
        stationStatusUrl: "https://gbfs.bcycle.com/bcycle_indego/station_status.json",
        provider: "Indego"
      },
      {
        id: "portland-biketown",
        city: "Portland, OR",
        centerLat: 45.5152,
        centerLon: -122.6784,
        loadRadiusKm: 95,
        stationInformationUrl: "https://gbfs.biketownpdx.com/gbfs/2.3/en/station_information.json",
        stationStatusUrl: "https://gbfs.biketownpdx.com/gbfs/2.3/en/station_status.json",
        provider: "BIKETOWN"
      },
      {
        id: "la-metro-bike",
        city: "Los Angeles, CA",
        centerLat: 34.0522,
        centerLon: -118.2437,
        loadRadiusKm: 120,
        stationInformationUrl: "https://gbfs.bcycle.com/bcycle_lametro/station_information.json",
        stationStatusUrl: "https://gbfs.bcycle.com/bcycle_lametro/station_status.json",
        provider: "Metro Bike"
      },
      {
        id: "austin-capmetro",
        city: "Austin, TX",
        centerLat: 30.2672,
        centerLon: -97.7431,
        loadRadiusKm: 90,
        stationInformationUrl: "https://austin.publicbikesystem.net/customer/gbfs/v2/en/station_information.json",
        stationStatusUrl: "https://austin.publicbikesystem.net/customer/gbfs/v2/en/station_status.json",
        provider: "CapMetro"
      },
      {
        id: "honolulu-biki",
        city: "Honolulu, HI",
        centerLat: 21.3069,
        centerLon: -157.8583,
        loadRadiusKm: 90,
        stationInformationUrl: "https://hon.publicbikesystem.net/customer/gbfs/v2/en/station_information.json",
        stationStatusUrl: "https://hon.publicbikesystem.net/customer/gbfs/v2/en/station_status.json",
        provider: "Biki"
      },
      {
        id: "columbus-cogo",
        city: "Columbus, OH",
        centerLat: 39.9612,
        centerLon: -82.9988,
        loadRadiusKm: 90,
        stationInformationUrl: "https://gbfs.cogobikeshare.com/gbfs/2.3/en/station_information.json",
        stationStatusUrl: "https://gbfs.cogobikeshare.com/gbfs/2.3/en/station_status.json",
        provider: "CoGo"
      },
      {
        id: "chattanooga-bikechatt",
        city: "Chattanooga, TN",
        centerLat: 35.0456,
        centerLon: -85.3097,
        loadRadiusKm: 90,
        stationInformationUrl: "https://chat.publicbikesystem.net/customer/gbfs/v2/en/station_information.json",
        stationStatusUrl: "https://chat.publicbikesystem.net/customer/gbfs/v2/en/station_status.json",
        provider: "Bike Chattanooga"
      },
      bcycleEntry({
        id: "boulder-bcycle",
        city: "Boulder, CO",
        centerLat: 40.015,
        centerLon: -105.2705,
        systemId: "bcycle_boulder"
      }),
      bcycleEntry({
        id: "milwaukee-bublr",
        city: "Milwaukee, WI",
        centerLat: 43.0389,
        centerLon: -87.9065,
        systemId: "bcycle_bublr",
        provider: "Bublr"
      }),
      bcycleEntry({
        id: "madison-bcycle",
        city: "Madison, WI",
        centerLat: 43.0731,
        centerLon: -89.4012,
        systemId: "bcycle_madison"
      }),
      bcycleEntry({
        id: "nashville-bcycle",
        city: "Nashville, TN",
        centerLat: 36.1627,
        centerLon: -86.7816,
        systemId: "bcycle_nashville"
      }),
      bcycleEntry({
        id: "salt-lake-greenbike",
        city: "Salt Lake City, UT",
        centerLat: 40.7608,
        centerLon: -111.891,
        systemId: "bcycle_greenbikeslc",
        provider: "GREENbike"
      }),
      bcycleEntry({
        id: "san-antonio-bcycle",
        city: "San Antonio, TX",
        centerLat: 29.4241,
        centerLon: -98.4936,
        systemId: "bcycle_sanantonio"
      }),
      bcycleEntry({
        id: "cincinnati-red-bike",
        city: "Cincinnati, OH",
        centerLat: 39.1031,
        centerLon: -84.512,
        systemId: "bcycle_cincyredbike",
        provider: "Red Bike"
      }),
      bcycleEntry({
        id: "el-paso-bcycle",
        city: "El Paso, TX",
        centerLat: 31.7619,
        centerLon: -106.485,
        systemId: "bcycle_elpaso"
      }),
      bcycleEntry({
        id: "indianapolis-pacers",
        city: "Indianapolis, IN",
        centerLat: 39.7684,
        centerLon: -86.1581,
        systemId: "bcycle_pacersbikeshare",
        provider: "Pacers Bikeshare"
      }),
      bcycleEntry({
        id: "fort-lauderdale-broward",
        city: "Fort Lauderdale, FL",
        centerLat: 26.1224,
        centerLon: -80.1373,
        systemId: "bcycle_broward",
        provider: "Broward B-cycle"
      }),
      bcycleEntry({
        id: "memphis-bcycle",
        city: "Memphis, TN",
        centerLat: 35.1495,
        centerLon: -90.049,
        systemId: "bcycle_memphis"
      }),
      bcycleEntry({
        id: "des-moines-bcycle",
        city: "Des Moines, IA",
        centerLat: 41.5868,
        centerLon: -93.625,
        systemId: "bcycle_desmoines"
      }),
      bcycleEntry({
        id: "tucson-tugo",
        city: "Tucson, AZ",
        centerLat: 32.2226,
        centerLon: -110.9747,
        systemId: "bcycle_tugo",
        provider: "Tugo"
      }),
      bcycleEntry({
        id: "fort-worth-trinity",
        city: "Fort Worth, TX",
        centerLat: 32.7555,
        centerLon: -97.3308,
        systemId: "bcycle_fortworth",
        provider: "Trinity Metro"
      }),
      bcycleEntry({
        id: "omaha-heartland",
        city: "Omaha, NE",
        centerLat: 41.2565,
        centerLon: -95.9345,
        systemId: "bcycle_heartland",
        provider: "Heartland B-cycle"
      }),
      bcycleEntry({
        id: "lincoln-bikelnk",
        city: "Lincoln, NE",
        centerLat: 40.8136,
        centerLon: -96.7026,
        systemId: "bcycle_bikelnk",
        provider: "BikeLNK"
      }),
      bcycleEntry({
        id: "greenville-sc-bcycle",
        city: "Greenville, SC",
        centerLat: 34.8526,
        centerLon: -82.394,
        systemId: "bcycle_greenville"
      }),
      bcycleEntry({
        id: "buffalo-reddy",
        city: "Buffalo, NY",
        centerLat: 42.8864,
        centerLon: -78.8784,
        systemId: "bcycle_reddy",
        provider: "Reddy Bikeshare"
      }),
      bcycleEntry({
        id: "las-vegas-rtc-bike-share",
        city: "Las Vegas, NV",
        centerLat: 36.1699,
        centerLon: -115.1398,
        systemId: "bcycle_rtcbikeshare",
        provider: "RTC Bike Share"
      }),
      bcycleEntry({
        id: "santa-barbara-bcycle",
        city: "Santa Barbara, CA",
        centerLat: 34.4208,
        centerLon: -119.6982,
        systemId: "bcycle_santabarbara"
      })
    ];
    GBFS_CITY_REGISTRY = (() => {
      const seen = /* @__PURE__ */ new Set();
      return RAW_GBFS_CITY_REGISTRY.map((entry) => {
        const normalized = normalizeRegistryEntry(entry);
        if (seen.has(normalized.id)) {
          throw new Error(`Duplicate GBFS city id: ${normalized.id}`);
        }
        seen.add(normalized.id);
        return normalized;
      });
    })();
    CITY_BY_ID = new Map(
      GBFS_CITY_REGISTRY.map((entry) => [entry.id, entry])
    );
  }
});

// src/data/bhoteKoshiIncidentPlaces.js
var bhoteKoshiIncidentPlaces_exports = {};
__export(bhoteKoshiIncidentPlaces_exports, {
  INCIDENT_OVERVIEW_HOLD_SEC: () => INCIDENT_OVERVIEW_HOLD_SEC,
  INCIDENT_OVERVIEW_PLACES: () => INCIDENT_OVERVIEW_PLACES
});
var INCIDENT_OVERVIEW_PLACES, INCIDENT_OVERVIEW_HOLD_SEC;
var init_bhoteKoshiIncidentPlaces = __esm({
  "src/data/bhoteKoshiIncidentPlaces.js"() {
    INCIDENT_OVERVIEW_PLACES = Object.freeze(
      [
        [
          "immediate-collapse-viewpoint",
          "COLLAPSE VIEWPOINT",
          28.3632333,
          85.4423639,
          2850,
          "left"
        ],
        [
          "debris-dammed-lake",
          "DAMMED LAKE",
          28.3346111,
          85.4861389,
          2750,
          "right"
        ],
        [
          "second-landslide",
          "SECOND LANDSLIDE",
          28.3379706,
          85.4688823,
          2750,
          "left"
        ],
        [
          "gyirong-border-gate",
          "BORDER GATE",
          28.2808338,
          85.3780248,
          1818,
          "right"
        ],
        ["timure-cluster", "TIMURE", 28.2519361, 85.3665833, 1689, "left"],
        [
          "syabru-besi",
          "SYABRU BESI",
          28.1602583333333,
          85.3325666666667,
          1417,
          "right"
        ],
        ["dhunche", "DHUNCHE", 28.1131861111111, 85.2953305555556, 1300, "left"],
        [
          "mailung-upper-trishuli",
          "UPPER TRISHULI",
          28.090925,
          85.2322916666667,
          950,
          "right"
        ],
        [
          "mailung-bazzar",
          "MAILUNG",
          28.0761666666667,
          85.2125277777778,
          800,
          "left"
        ],
        [
          "dandagaun",
          "DANDAGAUN",
          28.0751944444444,
          85.2076944444444,
          780,
          "right-lower"
        ],
        [
          "dandagaun-viewpoint",
          "DANDAGAUN VIEWPOINT",
          28.0354,
          85.1894361111111,
          700,
          "right"
        ],
        [
          "betrawati-bazaar",
          "BETRAWATI",
          27.9758992572246,
          85.1835331689033,
          600,
          "left"
        ],
        [
          "bhainse",
          "BHAINSE",
          27.9623111111111,
          85.1739777777778,
          500,
          "right-lower"
        ],
        [
          "bidur-trishuli-bridge",
          "BIDUR BRIDGE",
          27.920858,
          85.148029,
          510,
          "left"
        ],
        [
          "devighat-taadi-khola-bridge",
          "DEVIGHAT BRIDGE",
          27.8585278,
          85.1090318,
          350,
          "right"
        ]
      ].map(
        ([id, title, lat, lon, heightM, placement]) => Object.freeze({ id, title, lat, lon, heightM, placement })
      )
    );
    INCIDENT_OVERVIEW_HOLD_SEC = 11;
  }
});

// src/data/bhoteKoshiFloodPath.js
var bhoteKoshiFloodPath_exports = {};
__export(bhoteKoshiFloodPath_exports, {
  BHOTE_KOSHI_FLOOD_PATH: () => BHOTE_KOSHI_FLOOD_PATH
});
var BHOTE_KOSHI_FLOOD_PATH;
var init_bhoteKoshiFloodPath = __esm({
  "src/data/bhoteKoshiFloodPath.js"() {
    BHOTE_KOSHI_FLOOD_PATH = Object.freeze([
      Object.freeze([85.48476, 28.33255]),
      Object.freeze([85.48353, 28.33308]),
      Object.freeze([85.48231, 28.33279]),
      Object.freeze([85.48108, 28.33278]),
      Object.freeze([85.47985, 28.33304]),
      Object.freeze([85.47863, 28.33275]),
      Object.freeze([85.47741, 28.33301]),
      Object.freeze([85.47618, 28.33299]),
      Object.freeze([85.47496, 28.33325]),
      Object.freeze([85.47373, 28.33351]),
      Object.freeze([85.4725, 28.33377]),
      Object.freeze([85.47128, 28.33375]),
      Object.freeze([85.47005, 28.33401]),
      Object.freeze([85.46881, 28.33481]),
      Object.freeze([85.46759, 28.33506]),
      Object.freeze([85.46636, 28.33532]),
      Object.freeze([85.46513, 28.33585]),
      Object.freeze([85.4639, 28.33584]),
      Object.freeze([85.46267, 28.33609]),
      Object.freeze([85.46145, 28.33635]),
      Object.freeze([85.46022, 28.33661]),
      Object.freeze([85.45899, 28.33659]),
      Object.freeze([85.45777, 28.33685]),
      Object.freeze([85.45655, 28.33629]),
      Object.freeze([85.45533, 28.33628]),
      Object.freeze([85.45411, 28.336]),
      Object.freeze([85.45289, 28.33544]),
      Object.freeze([85.45167, 28.33543]),
      Object.freeze([85.45045, 28.33514]),
      Object.freeze([85.44922, 28.33513]),
      Object.freeze([85.448, 28.33511]),
      Object.freeze([85.44677, 28.33537]),
      Object.freeze([85.44554, 28.33563]),
      Object.freeze([85.44432, 28.33534]),
      Object.freeze([85.4431, 28.33533]),
      Object.freeze([85.44188, 28.33504]),
      Object.freeze([85.44065, 28.3353]),
      Object.freeze([85.43943, 28.33529]),
      Object.freeze([85.43821, 28.335]),
      Object.freeze([85.43699, 28.33472]),
      Object.freeze([85.43577, 28.33416]),
      Object.freeze([85.43456, 28.33334]),
      Object.freeze([85.43335, 28.33251]),
      Object.freeze([85.43214, 28.33141]),
      Object.freeze([85.43093, 28.33059]),
      Object.freeze([85.42971, 28.33057]),
      Object.freeze([85.42848, 28.33056]),
      Object.freeze([85.42726, 28.33027]),
      Object.freeze([85.42604, 28.33026]),
      Object.freeze([85.42482, 28.33025]),
      Object.freeze([85.4236, 28.32996]),
      Object.freeze([85.42238, 28.32968]),
      Object.freeze([85.42116, 28.32939]),
      Object.freeze([85.41995, 28.32829]),
      Object.freeze([85.41873, 28.32774]),
      Object.freeze([85.41752, 28.32718]),
      Object.freeze([85.41629, 28.32744]),
      Object.freeze([85.41508, 28.32634]),
      Object.freeze([85.41387, 28.32524]),
      Object.freeze([85.41297, 28.32415]),
      Object.freeze([85.41268, 28.32306]),
      Object.freeze([85.41239, 28.32198]),
      Object.freeze([85.41241, 28.3209]),
      Object.freeze([85.41273, 28.31982]),
      Object.freeze([85.41275, 28.31873]),
      Object.freeze([85.41276, 28.31765]),
      Object.freeze([85.41308, 28.31657]),
      Object.freeze([85.41249, 28.31548]),
      Object.freeze([85.4122, 28.3144]),
      Object.freeze([85.41252, 28.31332]),
      Object.freeze([85.41254, 28.31223]),
      Object.freeze([85.41194, 28.31114]),
      Object.freeze([85.41196, 28.31006]),
      Object.freeze([85.41167, 28.30897]),
      Object.freeze([85.41077, 28.30788]),
      Object.freeze([85.40955, 28.30705]),
      Object.freeze([85.40865, 28.30596]),
      Object.freeze([85.40744, 28.30513]),
      Object.freeze([85.40623, 28.30404]),
      Object.freeze([85.40503, 28.30294]),
      Object.freeze([85.40381, 28.30238]),
      Object.freeze([85.4026, 28.30156]),
      Object.freeze([85.40139, 28.30046]),
      Object.freeze([85.40019, 28.29936]),
      Object.freeze([85.39898, 28.29827]),
      Object.freeze([85.39777, 28.29717]),
      Object.freeze([85.39748, 28.29608]),
      Object.freeze([85.39658, 28.29499]),
      Object.freeze([85.39629, 28.2939]),
      Object.freeze([85.3957, 28.29281]),
      Object.freeze([85.39449, 28.29172]),
      Object.freeze([85.39328, 28.29062]),
      Object.freeze([85.39238, 28.28953]),
      Object.freeze([85.39117, 28.28897]),
      Object.freeze([85.38996, 28.28787]),
      Object.freeze([85.38875, 28.28678]),
      Object.freeze([85.38754, 28.28622]),
      Object.freeze([85.38632, 28.28593]),
      Object.freeze([85.38511, 28.28511]),
      Object.freeze([85.3839, 28.28401]),
      Object.freeze([85.383, 28.28292]),
      Object.freeze([85.38179, 28.28182]),
      Object.freeze([85.38089, 28.28073]),
      Object.freeze([85.37968, 28.28017]),
      Object.freeze([85.37846, 28.27934]),
      Object.freeze([85.37725, 28.27852]),
      Object.freeze([85.37666, 28.27743]),
      Object.freeze([85.37668, 28.27634]),
      Object.freeze([85.37669, 28.27526]),
      Object.freeze([85.37701, 28.27418]),
      Object.freeze([85.37642, 28.27309]),
      Object.freeze([85.37644, 28.27201]),
      Object.freeze([85.37615, 28.27092]),
      Object.freeze([85.37616, 28.26984]),
      Object.freeze([85.37648, 28.26876]),
      Object.freeze([85.37558, 28.26767]),
      Object.freeze([85.37499, 28.26658]),
      Object.freeze([85.37378, 28.26548]),
      Object.freeze([85.37288, 28.26439]),
      Object.freeze([85.37198, 28.26329]),
      Object.freeze([85.37169, 28.26221]),
      Object.freeze([85.37048, 28.26111]),
      Object.freeze([85.36928, 28.26001]),
      Object.freeze([85.36806, 28.25973]),
      Object.freeze([85.36685, 28.25863]),
      Object.freeze([85.36656, 28.25754]),
      Object.freeze([85.36566, 28.25645]),
      Object.freeze([85.36507, 28.25536]),
      Object.freeze([85.36478, 28.25427]),
      Object.freeze([85.36449, 28.25318]),
      Object.freeze([85.36512, 28.25211]),
      Object.freeze([85.36452, 28.25102]),
      Object.freeze([85.36423, 28.24993]),
      Object.freeze([85.36425, 28.24885]),
      Object.freeze([85.36335, 28.24776]),
      Object.freeze([85.36245, 28.24666]),
      Object.freeze([85.36124, 28.24556]),
      Object.freeze([85.36004, 28.24447]),
      Object.freeze([85.35882, 28.24391]),
      Object.freeze([85.35823, 28.24282]),
      Object.freeze([85.35733, 28.24173]),
      Object.freeze([85.35734, 28.24064]),
      Object.freeze([85.35797, 28.23957]),
      Object.freeze([85.35799, 28.23849]),
      Object.freeze([85.3577, 28.2374]),
      Object.freeze([85.35802, 28.23632]),
      Object.freeze([85.35834, 28.23524]),
      Object.freeze([85.35928, 28.23417]),
      Object.freeze([85.3596, 28.23309]),
      Object.freeze([85.36023, 28.23202]),
      Object.freeze([85.36024, 28.23093]),
      Object.freeze([85.36057, 28.22985]),
      Object.freeze([85.36058, 28.22877]),
      Object.freeze([85.3609, 28.22769]),
      Object.freeze([85.36092, 28.22661]),
      Object.freeze([85.36094, 28.22553]),
      Object.freeze([85.36126, 28.22445]),
      Object.freeze([85.36067, 28.22336]),
      Object.freeze([85.36007, 28.22227]),
      Object.freeze([85.35886, 28.22117]),
      Object.freeze([85.35796, 28.22008]),
      Object.freeze([85.35706, 28.21898]),
      Object.freeze([85.35616, 28.21789]),
      Object.freeze([85.35526, 28.21679]),
      Object.freeze([85.35467, 28.2157]),
      Object.freeze([85.35469, 28.21462]),
      Object.freeze([85.3547, 28.21354]),
      Object.freeze([85.35472, 28.21246]),
      Object.freeze([85.35443, 28.21137]),
      Object.freeze([85.35414, 28.21028]),
      Object.freeze([85.35416, 28.2092]),
      Object.freeze([85.35448, 28.20812]),
      Object.freeze([85.3548, 28.20704]),
      Object.freeze([85.35482, 28.20596]),
      Object.freeze([85.35392, 28.20486]),
      Object.freeze([85.35332, 28.20377]),
      Object.freeze([85.35303, 28.20269]),
      Object.freeze([85.35275, 28.2016]),
      Object.freeze([85.35246, 28.20052]),
      Object.freeze([85.35247, 28.19943]),
      Object.freeze([85.35188, 28.19834]),
      Object.freeze([85.35128, 28.19725]),
      Object.freeze([85.35038, 28.19616]),
      Object.freeze([85.3501, 28.19507]),
      Object.freeze([85.3495, 28.19398]),
      Object.freeze([85.34891, 28.19289]),
      Object.freeze([85.34862, 28.1918]),
      Object.freeze([85.34802, 28.19071]),
      Object.freeze([85.34743, 28.18962]),
      Object.freeze([85.34622, 28.18853]),
      Object.freeze([85.34593, 28.18744]),
      Object.freeze([85.34565, 28.18635]),
      Object.freeze([85.34475, 28.18526]),
      Object.freeze([85.34385, 28.18417]),
      Object.freeze([85.34325, 28.18308]),
      Object.freeze([85.34266, 28.18199]),
      Object.freeze([85.34237, 28.1809]),
      Object.freeze([85.34239, 28.17982]),
      Object.freeze([85.34271, 28.17874]),
      Object.freeze([85.34272, 28.17765]),
      Object.freeze([85.34274, 28.17657]),
      Object.freeze([85.34215, 28.17548]),
      Object.freeze([85.34216, 28.1744]),
      Object.freeze([85.34249, 28.17332]),
      Object.freeze([85.34189, 28.17223]),
      Object.freeze([85.34191, 28.17115]),
      Object.freeze([85.34192, 28.17006]),
      Object.freeze([85.34255, 28.16899]),
      Object.freeze([85.34226, 28.1679]),
      Object.freeze([85.34289, 28.16683]),
      Object.freeze([85.3423, 28.16574]),
      Object.freeze([85.3417, 28.16465]),
      Object.freeze([85.34048, 28.16436]),
      Object.freeze([85.33928, 28.16353]),
      Object.freeze([85.33807, 28.16271]),
      Object.freeze([85.33747, 28.16162]),
      Object.freeze([85.33718, 28.16053]),
      Object.freeze([85.33628, 28.15971]),
      Object.freeze([85.33507, 28.15888]),
      Object.freeze([85.33385, 28.15859]),
      Object.freeze([85.33295, 28.15777]),
      Object.freeze([85.33174, 28.15694]),
      Object.freeze([85.33053, 28.15639]),
      Object.freeze([85.32932, 28.15529]),
      Object.freeze([85.32842, 28.1542]),
      Object.freeze([85.32721, 28.15337]),
      Object.freeze([85.32631, 28.15228]),
      Object.freeze([85.3251, 28.15145]),
      Object.freeze([85.32389, 28.15089]),
      Object.freeze([85.32267, 28.15061]),
      Object.freeze([85.32147, 28.14978]),
      Object.freeze([85.32026, 28.14895]),
      Object.freeze([85.31904, 28.1484]),
      Object.freeze([85.31783, 28.14784]),
      Object.freeze([85.31663, 28.14674]),
      Object.freeze([85.31541, 28.14619]),
      Object.freeze([85.3142, 28.14536]),
      Object.freeze([85.313, 28.14426]),
      Object.freeze([85.3124, 28.14317]),
      Object.freeze([85.31181, 28.14208]),
      Object.freeze([85.31058, 28.14261]),
      Object.freeze([85.30936, 28.14232]),
      Object.freeze([85.30816, 28.14122]),
      Object.freeze([85.30695, 28.14012]),
      Object.freeze([85.30575, 28.13903]),
      Object.freeze([85.30485, 28.13793]),
      Object.freeze([85.30456, 28.13685]),
      Object.freeze([85.30366, 28.13575]),
      Object.freeze([85.30307, 28.13466]),
      Object.freeze([85.30248, 28.13357]),
      Object.freeze([85.30127, 28.13274]),
      Object.freeze([85.30067, 28.13165]),
      Object.freeze([85.30039, 28.13057]),
      Object.freeze([85.3001, 28.12948]),
      Object.freeze([85.29889, 28.12838]),
      Object.freeze([85.29799, 28.12729]),
      Object.freeze([85.29709, 28.12647]),
      Object.freeze([85.29588, 28.12591]),
      Object.freeze([85.29467, 28.12508]),
      Object.freeze([85.29347, 28.12398]),
      Object.freeze([85.29226, 28.12316]),
      Object.freeze([85.29105, 28.12206]),
      Object.freeze([85.28985, 28.12096]),
      Object.freeze([85.28864, 28.11986]),
      Object.freeze([85.28775, 28.11877]),
      Object.freeze([85.28653, 28.11821]),
      Object.freeze([85.28532, 28.11765]),
      Object.freeze([85.28411, 28.11683]),
      Object.freeze([85.2829, 28.116]),
      Object.freeze([85.28231, 28.11491]),
      Object.freeze([85.28172, 28.11382]),
      Object.freeze([85.28082, 28.11272]),
      Object.freeze([85.27961, 28.11217]),
      Object.freeze([85.2787, 28.11134]),
      Object.freeze([85.27749, 28.11079]),
      Object.freeze([85.27629, 28.10969]),
      Object.freeze([85.27508, 28.10859]),
      Object.freeze([85.27388, 28.10749]),
      Object.freeze([85.27267, 28.10667]),
      Object.freeze([85.27177, 28.10584]),
      Object.freeze([85.27056, 28.10474]),
      Object.freeze([85.26936, 28.10392]),
      Object.freeze([85.26815, 28.10309]),
      Object.freeze([85.26695, 28.10199]),
      Object.freeze([85.26574, 28.10089]),
      Object.freeze([85.26454, 28.09979]),
      Object.freeze([85.26364, 28.0987]),
      Object.freeze([85.26274, 28.09761]),
      Object.freeze([85.26153, 28.09678]),
      Object.freeze([85.26033, 28.09568]),
      Object.freeze([85.25911, 28.09539]),
      Object.freeze([85.2579, 28.09511]),
      Object.freeze([85.25668, 28.09509]),
      Object.freeze([85.25546, 28.09481]),
      Object.freeze([85.25425, 28.09398]),
      Object.freeze([85.25304, 28.09342]),
      Object.freeze([85.25183, 28.09286]),
      Object.freeze([85.25061, 28.09285]),
      Object.freeze([85.24939, 28.09256]),
      Object.freeze([85.24818, 28.09201]),
      Object.freeze([85.24696, 28.09199]),
      Object.freeze([85.24573, 28.09252]),
      Object.freeze([85.24451, 28.0925]),
      Object.freeze([85.24328, 28.09248]),
      Object.freeze([85.24207, 28.0922]),
      Object.freeze([85.24085, 28.09191]),
      Object.freeze([85.23963, 28.0919]),
      Object.freeze([85.23841, 28.09161]),
      Object.freeze([85.2372, 28.09132]),
      Object.freeze([85.23598, 28.09104]),
      Object.freeze([85.23476, 28.09102]),
      Object.freeze([85.23355, 28.09019]),
      Object.freeze([85.23234, 28.08964]),
      Object.freeze([85.23113, 28.08881]),
      Object.freeze([85.22993, 28.08771]),
      Object.freeze([85.22872, 28.08688]),
      Object.freeze([85.22782, 28.08579]),
      Object.freeze([85.22692, 28.08496]),
      Object.freeze([85.22571, 28.08414]),
      Object.freeze([85.2245, 28.08358]),
      Object.freeze([85.22329, 28.08302]),
      Object.freeze([85.22208, 28.08219]),
      Object.freeze([85.22087, 28.08164]),
      Object.freeze([85.21966, 28.08108]),
      Object.freeze([85.21876, 28.08026]),
      Object.freeze([85.21755, 28.07943]),
      Object.freeze([85.21635, 28.07833]),
      Object.freeze([85.21514, 28.07723]),
      Object.freeze([85.21394, 28.0764]),
      Object.freeze([85.21272, 28.07585]),
      Object.freeze([85.21151, 28.07529]),
      Object.freeze([85.2103, 28.075]),
      Object.freeze([85.2094, 28.07391]),
      Object.freeze([85.20881, 28.07282]),
      Object.freeze([85.20791, 28.07172]),
      Object.freeze([85.20762, 28.07063]),
      Object.freeze([85.20672, 28.06954]),
      Object.freeze([85.20552, 28.06844]),
      Object.freeze([85.20523, 28.06735]),
      Object.freeze([85.20495, 28.06627]),
      Object.freeze([85.20588, 28.0652]),
      Object.freeze([85.2062, 28.06412]),
      Object.freeze([85.20683, 28.06304]),
      Object.freeze([85.20716, 28.06196]),
      Object.freeze([85.20717, 28.06088]),
      Object.freeze([85.2078, 28.05981]),
      Object.freeze([85.20751, 28.05872]),
      Object.freeze([85.20814, 28.05765]),
      Object.freeze([85.20847, 28.05657]),
      Object.freeze([85.20787, 28.05548]),
      Object.freeze([85.20759, 28.05439]),
      Object.freeze([85.20699, 28.0533]),
      Object.freeze([85.2061, 28.0522]),
      Object.freeze([85.20489, 28.05138]),
      Object.freeze([85.20369, 28.05028]),
      Object.freeze([85.2031, 28.04919]),
      Object.freeze([85.2022, 28.04809]),
      Object.freeze([85.20191, 28.04701]),
      Object.freeze([85.20101, 28.04591]),
      Object.freeze([85.19981, 28.04508]),
      Object.freeze([85.1986, 28.04398]),
      Object.freeze([85.19739, 28.04343]),
      Object.freeze([85.1965, 28.04233]),
      Object.freeze([85.19529, 28.0415]),
      Object.freeze([85.19439, 28.04041]),
      Object.freeze([85.1938, 28.03932]),
      Object.freeze([85.19382, 28.03824]),
      Object.freeze([85.19384, 28.03715]),
      Object.freeze([85.19355, 28.03607]),
      Object.freeze([85.19357, 28.03498]),
      Object.freeze([85.19328, 28.0339]),
      Object.freeze([85.1936, 28.03282]),
      Object.freeze([85.19362, 28.03174]),
      Object.freeze([85.19364, 28.03065]),
      Object.freeze([85.19305, 28.02956]),
      Object.freeze([85.19215, 28.02847]),
      Object.freeze([85.19156, 28.02738]),
      Object.freeze([85.19097, 28.02629]),
      Object.freeze([85.18976, 28.02573]),
      Object.freeze([85.18854, 28.02571]),
      Object.freeze([85.18732, 28.02515]),
      Object.freeze([85.18611, 28.0246]),
      Object.freeze([85.18522, 28.0235]),
      Object.freeze([85.18493, 28.02242]),
      Object.freeze([85.18556, 28.02134]),
      Object.freeze([85.1868, 28.02027]),
      Object.freeze([85.18742, 28.0192]),
      Object.freeze([85.18714, 28.01811]),
      Object.freeze([85.18746, 28.01703]),
      Object.freeze([85.18656, 28.01594]),
      Object.freeze([85.18536, 28.01484]),
      Object.freeze([85.18446, 28.01375]),
      Object.freeze([85.18418, 28.01266]),
      Object.freeze([85.18389, 28.01157]),
      Object.freeze([85.1836, 28.01049]),
      Object.freeze([85.18362, 28.0094]),
      Object.freeze([85.18364, 28.00832]),
      Object.freeze([85.18366, 28.00724]),
      Object.freeze([85.18368, 28.00615]),
      Object.freeze([85.1843, 28.00508]),
      Object.freeze([85.18432, 28.004]),
      Object.freeze([85.18404, 28.00291]),
      Object.freeze([85.18375, 28.00182]),
      Object.freeze([85.18438, 28.00075]),
      Object.freeze([85.18501, 27.99967]),
      Object.freeze([85.18533, 27.9986]),
      Object.freeze([85.18596, 27.99752]),
      Object.freeze([85.18567, 27.99643]),
      Object.freeze([85.18477, 27.99534]),
      Object.freeze([85.18357, 27.99424]),
      Object.freeze([85.18237, 27.99314]),
      Object.freeze([85.18239, 27.99206]),
      Object.freeze([85.18302, 27.99098]),
      Object.freeze([85.18273, 27.9899]),
      Object.freeze([85.18152, 27.98907]),
      Object.freeze([85.18062, 27.98824]),
      Object.freeze([85.18034, 27.98716]),
      Object.freeze([85.18066, 27.98608]),
      Object.freeze([85.18037, 27.98499]),
      Object.freeze([85.18039, 27.98391]),
      Object.freeze([85.18041, 27.98283]),
      Object.freeze([85.18043, 27.98174]),
      Object.freeze([85.18075, 27.98067]),
      Object.freeze([85.18138, 27.97959]),
      Object.freeze([85.1814, 27.97851]),
      Object.freeze([85.18172, 27.97743]),
      Object.freeze([85.18204, 27.97635]),
      Object.freeze([85.18236, 27.97527]),
      Object.freeze([85.18299, 27.9742]),
      Object.freeze([85.18362, 27.97312]),
      Object.freeze([85.18425, 27.97205]),
      Object.freeze([85.18396, 27.97096]),
      Object.freeze([85.18275, 27.9704]),
      Object.freeze([85.18154, 27.97012]),
      Object.freeze([85.18033, 27.96956]),
      Object.freeze([85.17911, 27.96927]),
      Object.freeze([85.17821, 27.96818]),
      Object.freeze([85.17762, 27.96709]),
      Object.freeze([85.17703, 27.966]),
      Object.freeze([85.17613, 27.9649]),
      Object.freeze([85.17492, 27.96434]),
      Object.freeze([85.17371, 27.96406]),
      Object.freeze([85.1725, 27.9635]),
      Object.freeze([85.17128, 27.96321]),
      Object.freeze([85.17008, 27.96238]),
      Object.freeze([85.16888, 27.96129]),
      Object.freeze([85.16859, 27.9602]),
      Object.freeze([85.168, 27.95911]),
      Object.freeze([85.16771, 27.95802]),
      Object.freeze([85.16682, 27.95693]),
      Object.freeze([85.16561, 27.95637]),
      Object.freeze([85.1644, 27.95581]),
      Object.freeze([85.16318, 27.95552]),
      Object.freeze([85.16198, 27.95442]),
      Object.freeze([85.1623, 27.95335]),
      Object.freeze([85.16232, 27.95226]),
      Object.freeze([85.16234, 27.95118]),
      Object.freeze([85.16236, 27.9501]),
      Object.freeze([85.16238, 27.94902]),
      Object.freeze([85.1627, 27.94794]),
      Object.freeze([85.16241, 27.94685]),
      Object.freeze([85.16152, 27.94576]),
      Object.freeze([85.16093, 27.94466]),
      Object.freeze([85.16034, 27.94357]),
      Object.freeze([85.15974, 27.94248]),
      Object.freeze([85.15915, 27.94139]),
      Object.freeze([85.15887, 27.9403]),
      Object.freeze([85.15797, 27.93921]),
      Object.freeze([85.15738, 27.93812]),
      Object.freeze([85.15679, 27.93703]),
      Object.freeze([85.1562, 27.93594]),
      Object.freeze([85.15561, 27.93485]),
      Object.freeze([85.15532, 27.93376]),
      Object.freeze([85.15473, 27.93267]),
      Object.freeze([85.15352, 27.93184]),
      Object.freeze([85.15229, 27.93291]),
      Object.freeze([85.15105, 27.9337]),
      Object.freeze([85.15015, 27.93288]),
      Object.freeze([85.14987, 27.93179]),
      Object.freeze([85.14988, 27.93071]),
      Object.freeze([85.14929, 27.92962]),
      Object.freeze([85.14901, 27.92853]),
      Object.freeze([85.14994, 27.92746]),
      Object.freeze([85.15057, 27.92639]),
      Object.freeze([85.15089, 27.92531]),
      Object.freeze([85.15121, 27.92423]),
      Object.freeze([85.15123, 27.92315]),
      Object.freeze([85.15034, 27.92205]),
      Object.freeze([85.14943, 27.92177])
    ]);
  }
});

// node_modules/satellite.js/dist/satellite.es.js
var pi = Math.PI;
var twoPi = pi * 2;
var deg2rad = pi / 180;
var rad2deg = 180 / pi;
var minutesPerDay = 1440;
var mu = 398600.8;
var earthRadius = 6378.135;
var xke = 60 / Math.sqrt(earthRadius * earthRadius * earthRadius / mu);
var vkmpersec = earthRadius * xke / 60;
var tumin = 1 / xke;
var j2 = 1082616e-9;
var j3 = -253881e-11;
var j4 = -165597e-11;
var j3oj2 = j3 / j2;
var x2o3 = 2 / 3;
var xpdotp = 1440 / (2 * pi);
function days2mdhms(year, days) {
  var lmonth = [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var dayofyr = Math.floor(days);
  var i = 1;
  var inttemp = 0;
  while (dayofyr > inttemp + lmonth[i - 1] && i < 12) {
    inttemp += lmonth[i - 1];
    i += 1;
  }
  var mon = i;
  var day = dayofyr - inttemp;
  var temp = (days - dayofyr) * 24;
  var hr = Math.floor(temp);
  temp = (temp - hr) * 60;
  var minute = Math.floor(temp);
  var sec = (temp - minute) * 60;
  return {
    mon,
    day,
    hr,
    minute,
    sec
  };
}
function jdayInternal(year, mon, day, hr, minute, sec) {
  var msec = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : 0;
  return 367 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12)) * 0.25) + Math.floor(275 * mon / 9) + day + 17210135e-1 + ((msec / 6e4 + sec / 60 + minute) / 60 + hr) / 24;
}
function jday(yearOrDate, mon, day, hr, minute, sec) {
  var msec = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : 0;
  if (yearOrDate instanceof Date) {
    var date = yearOrDate;
    return jdayInternal(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      // Note, this function requires months in range 1-12.
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    );
  }
  return jdayInternal(yearOrDate, mon, day, hr, minute, sec, msec);
}
function dpper(satrec, options) {
  var e3 = satrec.e3, ee2 = satrec.ee2, peo = satrec.peo, pgho = satrec.pgho, pho = satrec.pho, pinco = satrec.pinco, plo = satrec.plo, se2 = satrec.se2, se3 = satrec.se3, sgh2 = satrec.sgh2, sgh3 = satrec.sgh3, sgh4 = satrec.sgh4, sh2 = satrec.sh2, sh3 = satrec.sh3, si2 = satrec.si2, si3 = satrec.si3, sl2 = satrec.sl2, sl3 = satrec.sl3, sl4 = satrec.sl4, t = satrec.t, xgh2 = satrec.xgh2, xgh3 = satrec.xgh3, xgh4 = satrec.xgh4, xh2 = satrec.xh2, xh3 = satrec.xh3, xi2 = satrec.xi2, xi3 = satrec.xi3, xl2 = satrec.xl2, xl3 = satrec.xl3, xl4 = satrec.xl4, zmol = satrec.zmol, zmos = satrec.zmos;
  var init = options.init, opsmode = options.opsmode;
  var ep = options.ep, inclp = options.inclp, nodep = options.nodep, argpp = options.argpp, mp = options.mp;
  var alfdp;
  var betdp;
  var cosip;
  var sinip;
  var cosop;
  var sinop;
  var dalf;
  var dbet;
  var dls;
  var f2;
  var f3;
  var pe;
  var pgh;
  var ph;
  var pinc;
  var pl;
  var sinzf;
  var xls;
  var xnoh;
  var zf;
  var zm;
  var zns = 119459e-10;
  var zes = 0.01675;
  var znl = 15835218e-11;
  var zel = 0.0549;
  zm = zmos + zns * t;
  if (init === "y") {
    zm = zmos;
  }
  zf = zm + 2 * zes * Math.sin(zm);
  sinzf = Math.sin(zf);
  f2 = 0.5 * sinzf * sinzf - 0.25;
  f3 = -0.5 * sinzf * Math.cos(zf);
  var ses = se2 * f2 + se3 * f3;
  var sis = si2 * f2 + si3 * f3;
  var sls = sl2 * f2 + sl3 * f3 + sl4 * sinzf;
  var sghs = sgh2 * f2 + sgh3 * f3 + sgh4 * sinzf;
  var shs = sh2 * f2 + sh3 * f3;
  zm = zmol + znl * t;
  if (init === "y") {
    zm = zmol;
  }
  zf = zm + 2 * zel * Math.sin(zm);
  sinzf = Math.sin(zf);
  f2 = 0.5 * sinzf * sinzf - 0.25;
  f3 = -0.5 * sinzf * Math.cos(zf);
  var sel = ee2 * f2 + e3 * f3;
  var sil = xi2 * f2 + xi3 * f3;
  var sll = xl2 * f2 + xl3 * f3 + xl4 * sinzf;
  var sghl = xgh2 * f2 + xgh3 * f3 + xgh4 * sinzf;
  var shll = xh2 * f2 + xh3 * f3;
  pe = ses + sel;
  pinc = sis + sil;
  pl = sls + sll;
  pgh = sghs + sghl;
  ph = shs + shll;
  if (init === "n") {
    pe -= peo;
    pinc -= pinco;
    pl -= plo;
    pgh -= pgho;
    ph -= pho;
    inclp += pinc;
    ep += pe;
    sinip = Math.sin(inclp);
    cosip = Math.cos(inclp);
    if (inclp >= 0.2) {
      ph /= sinip;
      pgh -= cosip * ph;
      argpp += pgh;
      nodep += ph;
      mp += pl;
    } else {
      sinop = Math.sin(nodep);
      cosop = Math.cos(nodep);
      alfdp = sinip * sinop;
      betdp = sinip * cosop;
      dalf = ph * cosop + pinc * cosip * sinop;
      dbet = -ph * sinop + pinc * cosip * cosop;
      alfdp += dalf;
      betdp += dbet;
      nodep %= twoPi;
      if (nodep < 0 && opsmode === "a") {
        nodep += twoPi;
      }
      xls = mp + argpp + cosip * nodep;
      dls = pl + pgh - pinc * nodep * sinip;
      xls += dls;
      xnoh = nodep;
      nodep = Math.atan2(alfdp, betdp);
      if (nodep < 0 && opsmode === "a") {
        nodep += twoPi;
      }
      if (Math.abs(xnoh - nodep) > pi) {
        if (nodep < xnoh) {
          nodep += twoPi;
        } else {
          nodep -= twoPi;
        }
      }
      mp += pl;
      argpp = xls - mp - cosip * nodep;
    }
  }
  return {
    ep,
    inclp,
    nodep,
    argpp,
    mp
  };
}
function dscom(options) {
  var epoch = options.epoch, ep = options.ep, argpp = options.argpp, tc = options.tc, inclp = options.inclp, nodep = options.nodep, np = options.np;
  var a1;
  var a2;
  var a3;
  var a4;
  var a5;
  var a6;
  var a7;
  var a8;
  var a9;
  var a10;
  var cc;
  var x1;
  var x2;
  var x3;
  var x4;
  var x5;
  var x6;
  var x7;
  var x8;
  var zcosg;
  var zsing;
  var zcosh;
  var zsinh;
  var zcosi;
  var zsini;
  var ss1;
  var ss2;
  var ss3;
  var ss4;
  var ss5;
  var ss6;
  var ss7;
  var sz1;
  var sz2;
  var sz3;
  var sz11;
  var sz12;
  var sz13;
  var sz21;
  var sz22;
  var sz23;
  var sz31;
  var sz32;
  var sz33;
  var s1;
  var s2;
  var s3;
  var s4;
  var s5;
  var s6;
  var s7;
  var z1;
  var z2;
  var z3;
  var z11;
  var z12;
  var z13;
  var z21;
  var z22;
  var z23;
  var z31;
  var z32;
  var z33;
  var zes = 0.01675;
  var zel = 0.0549;
  var c1ss = 29864797e-13;
  var c1l = 47968065e-14;
  var zsinis = 0.39785416;
  var zcosis = 0.91744867;
  var zcosgs = 0.1945905;
  var zsings = -0.98088458;
  var nm = np;
  var em = ep;
  var snodm = Math.sin(nodep);
  var cnodm = Math.cos(nodep);
  var sinomm = Math.sin(argpp);
  var cosomm = Math.cos(argpp);
  var sinim = Math.sin(inclp);
  var cosim = Math.cos(inclp);
  var emsq = em * em;
  var betasq = 1 - emsq;
  var rtemsq = Math.sqrt(betasq);
  var peo = 0;
  var pinco = 0;
  var plo = 0;
  var pgho = 0;
  var pho = 0;
  var day = epoch + 18261.5 + tc / 1440;
  var xnodce = (4.523602 - 92422029e-11 * day) % twoPi;
  var stem = Math.sin(xnodce);
  var ctem = Math.cos(xnodce);
  var zcosil = 0.91375164 - 0.03568096 * ctem;
  var zsinil = Math.sqrt(1 - zcosil * zcosil);
  var zsinhl = 0.089683511 * stem / zsinil;
  var zcoshl = Math.sqrt(1 - zsinhl * zsinhl);
  var gam = 5.8351514 + 1944368e-9 * day;
  var zx = 0.39785416 * stem / zsinil;
  var zy = zcoshl * ctem + 0.91744867 * zsinhl * stem;
  zx = Math.atan2(zx, zy);
  zx += gam - xnodce;
  var zcosgl = Math.cos(zx);
  var zsingl = Math.sin(zx);
  zcosg = zcosgs;
  zsing = zsings;
  zcosi = zcosis;
  zsini = zsinis;
  zcosh = cnodm;
  zsinh = snodm;
  cc = c1ss;
  var xnoi = 1 / nm;
  var lsflg = 0;
  while (lsflg < 2) {
    lsflg += 1;
    a1 = zcosg * zcosh + zsing * zcosi * zsinh;
    a3 = -zsing * zcosh + zcosg * zcosi * zsinh;
    a7 = -zcosg * zsinh + zsing * zcosi * zcosh;
    a8 = zsing * zsini;
    a9 = zsing * zsinh + zcosg * zcosi * zcosh;
    a10 = zcosg * zsini;
    a2 = cosim * a7 + sinim * a8;
    a4 = cosim * a9 + sinim * a10;
    a5 = -sinim * a7 + cosim * a8;
    a6 = -sinim * a9 + cosim * a10;
    x1 = a1 * cosomm + a2 * sinomm;
    x2 = a3 * cosomm + a4 * sinomm;
    x3 = -a1 * sinomm + a2 * cosomm;
    x4 = -a3 * sinomm + a4 * cosomm;
    x5 = a5 * sinomm;
    x6 = a6 * sinomm;
    x7 = a5 * cosomm;
    x8 = a6 * cosomm;
    z31 = 12 * x1 * x1 - 3 * x3 * x3;
    z32 = 24 * x1 * x2 - 6 * x3 * x4;
    z33 = 12 * x2 * x2 - 3 * x4 * x4;
    z1 = 3 * (a1 * a1 + a2 * a2) + z31 * emsq;
    z2 = 6 * (a1 * a3 + a2 * a4) + z32 * emsq;
    z3 = 3 * (a3 * a3 + a4 * a4) + z33 * emsq;
    z11 = -6 * a1 * a5 + emsq * (-24 * x1 * x7 - 6 * x3 * x5);
    z12 = -6 * (a1 * a6 + a3 * a5) + emsq * (-24 * (x2 * x7 + x1 * x8) + -6 * (x3 * x6 + x4 * x5));
    z13 = -6 * a3 * a6 + emsq * (-24 * x2 * x8 - 6 * x4 * x6);
    z21 = 6 * a2 * a5 + emsq * (24 * x1 * x5 - 6 * x3 * x7);
    z22 = 6 * (a4 * a5 + a2 * a6) + emsq * (24 * (x2 * x5 + x1 * x6) - 6 * (x4 * x7 + x3 * x8));
    z23 = 6 * a4 * a6 + emsq * (24 * x2 * x6 - 6 * x4 * x8);
    z1 = z1 + z1 + betasq * z31;
    z2 = z2 + z2 + betasq * z32;
    z3 = z3 + z3 + betasq * z33;
    s3 = cc * xnoi;
    s2 = -0.5 * s3 / rtemsq;
    s4 = s3 * rtemsq;
    s1 = -15 * em * s4;
    s5 = x1 * x3 + x2 * x4;
    s6 = x2 * x3 + x1 * x4;
    s7 = x2 * x4 - x1 * x3;
    if (lsflg === 1) {
      ss1 = s1;
      ss2 = s2;
      ss3 = s3;
      ss4 = s4;
      ss5 = s5;
      ss6 = s6;
      ss7 = s7;
      sz1 = z1;
      sz2 = z2;
      sz3 = z3;
      sz11 = z11;
      sz12 = z12;
      sz13 = z13;
      sz21 = z21;
      sz22 = z22;
      sz23 = z23;
      sz31 = z31;
      sz32 = z32;
      sz33 = z33;
      zcosg = zcosgl;
      zsing = zsingl;
      zcosi = zcosil;
      zsini = zsinil;
      zcosh = zcoshl * cnodm + zsinhl * snodm;
      zsinh = snodm * zcoshl - cnodm * zsinhl;
      cc = c1l;
    }
  }
  var zmol = (4.7199672 + (0.2299715 * day - gam)) % twoPi;
  var zmos = (6.2565837 + 0.017201977 * day) % twoPi;
  var se2 = 2 * ss1 * ss6;
  var se3 = 2 * ss1 * ss7;
  var si2 = 2 * ss2 * sz12;
  var si3 = 2 * ss2 * (sz13 - sz11);
  var sl2 = -2 * ss3 * sz2;
  var sl3 = -2 * ss3 * (sz3 - sz1);
  var sl4 = -2 * ss3 * (-21 - 9 * emsq) * zes;
  var sgh2 = 2 * ss4 * sz32;
  var sgh3 = 2 * ss4 * (sz33 - sz31);
  var sgh4 = -18 * ss4 * zes;
  var sh2 = -2 * ss2 * sz22;
  var sh3 = -2 * ss2 * (sz23 - sz21);
  var ee2 = 2 * s1 * s6;
  var e3 = 2 * s1 * s7;
  var xi2 = 2 * s2 * z12;
  var xi3 = 2 * s2 * (z13 - z11);
  var xl2 = -2 * s3 * z2;
  var xl3 = -2 * s3 * (z3 - z1);
  var xl4 = -2 * s3 * (-21 - 9 * emsq) * zel;
  var xgh2 = 2 * s4 * z32;
  var xgh3 = 2 * s4 * (z33 - z31);
  var xgh4 = -18 * s4 * zel;
  var xh2 = -2 * s2 * z22;
  var xh3 = -2 * s2 * (z23 - z21);
  return {
    snodm,
    cnodm,
    sinim,
    cosim,
    sinomm,
    cosomm,
    day,
    e3,
    ee2,
    em,
    emsq,
    gam,
    peo,
    pgho,
    pho,
    pinco,
    plo,
    rtemsq,
    se2,
    se3,
    sgh2,
    sgh3,
    sgh4,
    sh2,
    sh3,
    si2,
    si3,
    sl2,
    sl3,
    sl4,
    s1,
    s2,
    s3,
    s4,
    s5,
    s6,
    s7,
    ss1,
    ss2,
    ss3,
    ss4,
    ss5,
    ss6,
    ss7,
    sz1,
    sz2,
    sz3,
    sz11,
    sz12,
    sz13,
    sz21,
    sz22,
    sz23,
    sz31,
    sz32,
    sz33,
    xgh2,
    xgh3,
    xgh4,
    xh2,
    xh3,
    xi2,
    xi3,
    xl2,
    xl3,
    xl4,
    nm,
    z1,
    z2,
    z3,
    z11,
    z12,
    z13,
    z21,
    z22,
    z23,
    z31,
    z32,
    z33,
    zmol,
    zmos
  };
}
function dsinit(options) {
  var cosim = options.cosim, argpo = options.argpo, s1 = options.s1, s2 = options.s2, s3 = options.s3, s4 = options.s4, s5 = options.s5, sinim = options.sinim, ss1 = options.ss1, ss2 = options.ss2, ss3 = options.ss3, ss4 = options.ss4, ss5 = options.ss5, sz1 = options.sz1, sz3 = options.sz3, sz11 = options.sz11, sz13 = options.sz13, sz21 = options.sz21, sz23 = options.sz23, sz31 = options.sz31, sz33 = options.sz33, t = options.t, tc = options.tc, gsto = options.gsto, mo = options.mo, mdot = options.mdot, no = options.no, nodeo = options.nodeo, nodedot = options.nodedot, xpidot = options.xpidot, z1 = options.z1, z3 = options.z3, z11 = options.z11, z13 = options.z13, z21 = options.z21, z23 = options.z23, z31 = options.z31, z33 = options.z33, ecco = options.ecco, eccsq = options.eccsq;
  var emsq = options.emsq, em = options.em, argpm = options.argpm, inclm = options.inclm, mm = options.mm, nm = options.nm, nodem = options.nodem, irez = options.irez, atime = options.atime, d2201 = options.d2201, d2211 = options.d2211, d3210 = options.d3210, d3222 = options.d3222, d4410 = options.d4410, d4422 = options.d4422, d5220 = options.d5220, d5232 = options.d5232, d5421 = options.d5421, d5433 = options.d5433, dedt = options.dedt, didt = options.didt, dmdt = options.dmdt, dnodt = options.dnodt, domdt = options.domdt, del1 = options.del1, del2 = options.del2, del3 = options.del3, xfact = options.xfact, xlamo = options.xlamo, xli = options.xli, xni = options.xni;
  var f220;
  var f221;
  var f311;
  var f321;
  var f322;
  var f330;
  var f441;
  var f442;
  var f522;
  var f523;
  var f542;
  var f543;
  var g200;
  var g201;
  var g211;
  var g300;
  var g310;
  var g322;
  var g410;
  var g422;
  var g520;
  var g521;
  var g532;
  var g533;
  var sini2;
  var temp;
  var temp1;
  var xno2;
  var ainv2;
  var aonv;
  var cosisq;
  var eoc;
  var q22 = 17891679e-13;
  var q31 = 21460748e-13;
  var q33 = 22123015e-14;
  var root22 = 17891679e-13;
  var root44 = 73636953e-16;
  var root54 = 21765803e-16;
  var rptim = 0.0043752690880113;
  var root32 = 37393792e-14;
  var root52 = 11428639e-14;
  var znl = 15835218e-11;
  var zns = 119459e-10;
  irez = 0;
  if (nm < 0.0052359877 && nm > 0.0034906585) {
    irez = 1;
  }
  if (nm >= 826e-5 && nm <= 924e-5 && em >= 0.5) {
    irez = 2;
  }
  var ses = ss1 * zns * ss5;
  var sis = ss2 * zns * (sz11 + sz13);
  var sls = -zns * ss3 * (sz1 + sz3 - 14 - 6 * emsq);
  var sghs = ss4 * zns * (sz31 + sz33 - 6);
  var shs = -zns * ss2 * (sz21 + sz23);
  if (inclm < 0.052359877 || inclm > pi - 0.052359877) {
    shs = 0;
  }
  if (sinim !== 0) {
    shs /= sinim;
  }
  var sgs = sghs - cosim * shs;
  dedt = ses + s1 * znl * s5;
  didt = sis + s2 * znl * (z11 + z13);
  dmdt = sls - znl * s3 * (z1 + z3 - 14 - 6 * emsq);
  var sghl = s4 * znl * (z31 + z33 - 6);
  var shll = -znl * s2 * (z21 + z23);
  if (inclm < 0.052359877 || inclm > pi - 0.052359877) {
    shll = 0;
  }
  domdt = sgs + sghl;
  dnodt = shs;
  if (sinim !== 0) {
    domdt -= cosim / sinim * shll;
    dnodt += shll / sinim;
  }
  var dndt = 0;
  var theta = (gsto + tc * rptim) % twoPi;
  em += dedt * t;
  inclm += didt * t;
  argpm += domdt * t;
  nodem += dnodt * t;
  mm += dmdt * t;
  if (irez !== 0) {
    aonv = Math.pow(nm / xke, x2o3);
    if (irez === 2) {
      cosisq = cosim * cosim;
      var emo = em;
      em = ecco;
      var emsqo = emsq;
      emsq = eccsq;
      eoc = em * emsq;
      g201 = -0.306 - (em - 0.64) * 0.44;
      if (em <= 0.65) {
        g211 = 3.616 - 13.247 * em + 16.29 * emsq;
        g310 = -19.302 + 117.39 * em - 228.419 * emsq + 156.591 * eoc;
        g322 = -18.9068 + 109.7927 * em - 214.6334 * emsq + 146.5816 * eoc;
        g410 = -41.122 + 242.694 * em - 471.094 * emsq + 313.953 * eoc;
        g422 = -146.407 + 841.88 * em - 1629.014 * emsq + 1083.435 * eoc;
        g520 = -532.114 + 3017.977 * em - 5740.032 * emsq + 3708.276 * eoc;
      } else {
        g211 = -72.099 + 331.819 * em - 508.738 * emsq + 266.724 * eoc;
        g310 = -346.844 + 1582.851 * em - 2415.925 * emsq + 1246.113 * eoc;
        g322 = -342.585 + 1554.908 * em - 2366.899 * emsq + 1215.972 * eoc;
        g410 = -1052.797 + 4758.686 * em - 7193.992 * emsq + 3651.957 * eoc;
        g422 = -3581.69 + 16178.11 * em - 24462.77 * emsq + 12422.52 * eoc;
        if (em > 0.715) {
          g520 = -5149.66 + 29936.92 * em - 54087.36 * emsq + 31324.56 * eoc;
        } else {
          g520 = 1464.74 - 4664.75 * em + 3763.64 * emsq;
        }
      }
      if (em < 0.7) {
        g533 = -919.2277 + 4988.61 * em - 9064.77 * emsq + 5542.21 * eoc;
        g521 = -822.71072 + 4568.6173 * em - 8491.4146 * emsq + 5337.524 * eoc;
        g532 = -853.666 + 4690.25 * em - 8624.77 * emsq + 5341.4 * eoc;
      } else {
        g533 = -37995.78 + 161616.52 * em - 229838.2 * emsq + 109377.94 * eoc;
        g521 = -51752.104 + 218913.95 * em - 309468.16 * emsq + 146349.42 * eoc;
        g532 = -40023.88 + 170470.89 * em - 242699.48 * emsq + 115605.82 * eoc;
      }
      sini2 = sinim * sinim;
      f220 = 0.75 * (1 + 2 * cosim + cosisq);
      f221 = 1.5 * sini2;
      f321 = 1.875 * sinim * (1 - 2 * cosim - 3 * cosisq);
      f322 = -1.875 * sinim * (1 + 2 * cosim - 3 * cosisq);
      f441 = 35 * sini2 * f220;
      f442 = 39.375 * sini2 * sini2;
      f522 = 9.84375 * sinim * (sini2 * (1 - 2 * cosim - 5 * cosisq) + 0.33333333 * (-2 + 4 * cosim + 6 * cosisq));
      f523 = sinim * (4.92187512 * sini2 * (-2 - 4 * cosim + 10 * cosisq) + 6.56250012 * (1 + 2 * cosim - 3 * cosisq));
      f542 = 29.53125 * sinim * (2 - 8 * cosim + cosisq * (-12 + 8 * cosim + 10 * cosisq));
      f543 = 29.53125 * sinim * (-2 - 8 * cosim + cosisq * (12 + 8 * cosim - 10 * cosisq));
      xno2 = nm * nm;
      ainv2 = aonv * aonv;
      temp1 = 3 * xno2 * ainv2;
      temp = temp1 * root22;
      d2201 = temp * f220 * g201;
      d2211 = temp * f221 * g211;
      temp1 *= aonv;
      temp = temp1 * root32;
      d3210 = temp * f321 * g310;
      d3222 = temp * f322 * g322;
      temp1 *= aonv;
      temp = 2 * temp1 * root44;
      d4410 = temp * f441 * g410;
      d4422 = temp * f442 * g422;
      temp1 *= aonv;
      temp = temp1 * root52;
      d5220 = temp * f522 * g520;
      d5232 = temp * f523 * g532;
      temp = 2 * temp1 * root54;
      d5421 = temp * f542 * g521;
      d5433 = temp * f543 * g533;
      xlamo = (mo + nodeo + nodeo - (theta + theta)) % twoPi;
      xfact = mdot + dmdt + 2 * (nodedot + dnodt - rptim) - no;
      em = emo;
      emsq = emsqo;
    }
    if (irez === 1) {
      g200 = 1 + emsq * (-2.5 + 0.8125 * emsq);
      g310 = 1 + 2 * emsq;
      g300 = 1 + emsq * (-6 + 6.60937 * emsq);
      f220 = 0.75 * (1 + cosim) * (1 + cosim);
      f311 = 0.9375 * sinim * sinim * (1 + 3 * cosim) - 0.75 * (1 + cosim);
      f330 = 1 + cosim;
      f330 *= 1.875 * f330 * f330;
      del1 = 3 * nm * nm * aonv * aonv;
      del2 = 2 * del1 * f220 * g200 * q22;
      del3 = 3 * del1 * f330 * g300 * q33 * aonv;
      del1 = del1 * f311 * g310 * q31 * aonv;
      xlamo = (mo + nodeo + argpo - theta) % twoPi;
      xfact = mdot + xpidot + dmdt + domdt + dnodt - (no + rptim);
    }
    xli = xlamo;
    xni = no;
    atime = 0;
    nm = no + dndt;
  }
  return {
    em,
    argpm,
    inclm,
    mm,
    nm,
    nodem,
    irez,
    atime,
    d2201,
    d2211,
    d3210,
    d3222,
    d4410,
    d4422,
    d5220,
    d5232,
    d5421,
    d5433,
    dedt,
    didt,
    dmdt,
    dndt,
    dnodt,
    domdt,
    del1,
    del2,
    del3,
    xfact,
    xlamo,
    xli,
    xni
  };
}
function gstimeInternal(jdut1) {
  var tut1 = (jdut1 - 2451545) / 36525;
  var temp = -62e-7 * tut1 * tut1 * tut1 + 0.093104 * tut1 * tut1 + (876600 * 3600 + 8640184812866e-6) * tut1 + 67310.54841;
  temp = temp * deg2rad / 240 % twoPi;
  if (temp < 0) {
    temp += twoPi;
  }
  return temp;
}
function gstime(first, month, day, hour, minute, second, millisecond) {
  if (first instanceof Date) {
    return gstimeInternal(jday(first));
  } else if (month !== void 0) {
    return gstimeInternal(jday(first, month, day, hour, minute, second, millisecond));
  } else {
    return gstimeInternal(first);
  }
}
function initl(options) {
  var ecco = options.ecco, epoch = options.epoch, inclo = options.inclo, opsmode = options.opsmode;
  var no = options.no;
  var eccsq = ecco * ecco;
  var omeosq = 1 - eccsq;
  var rteosq = Math.sqrt(omeosq);
  var cosio = Math.cos(inclo);
  var cosio2 = cosio * cosio;
  var ak = Math.pow(xke / no, x2o3);
  var d1 = 0.75 * j2 * (3 * cosio2 - 1) / (rteosq * omeosq);
  var delPrime = d1 / (ak * ak);
  var adel = ak * (1 - delPrime * delPrime - delPrime * (1 / 3 + 134 * delPrime * delPrime / 81));
  delPrime = d1 / (adel * adel);
  no /= 1 + delPrime;
  var ao = Math.pow(xke / no, x2o3);
  var sinio = Math.sin(inclo);
  var po = ao * omeosq;
  var con42 = 1 - 5 * cosio2;
  var con41 = -con42 - cosio2 - cosio2;
  var ainv = 1 / ao;
  var posq = po * po;
  var rp = ao * (1 - ecco);
  var method = "n";
  var gsto;
  if (opsmode === "a") {
    var ts70 = epoch - 7305;
    var ds70 = Math.floor(ts70 + 1e-8);
    var tfrac = ts70 - ds70;
    var c1 = 0.017202791694070362;
    var thgr70 = 1.7321343856509375;
    var fk5r = 5075514194322695e-30;
    var c1p2p = c1 + twoPi;
    gsto = (thgr70 + c1 * ds70 + c1p2p * tfrac + ts70 * ts70 * fk5r) % twoPi;
    if (gsto < 0) {
      gsto += twoPi;
    }
  } else {
    gsto = gstime(epoch + 24332815e-1);
  }
  return {
    no,
    method,
    ainv,
    ao,
    con41,
    con42,
    cosio,
    cosio2,
    eccsq,
    omeosq,
    posq,
    rp,
    rteosq,
    sinio,
    gsto
  };
}
function dspace(options) {
  var irez = options.irez, d2201 = options.d2201, d2211 = options.d2211, d3210 = options.d3210, d3222 = options.d3222, d4410 = options.d4410, d4422 = options.d4422, d5220 = options.d5220, d5232 = options.d5232, d5421 = options.d5421, d5433 = options.d5433, dedt = options.dedt, del1 = options.del1, del2 = options.del2, del3 = options.del3, didt = options.didt, dmdt = options.dmdt, dnodt = options.dnodt, domdt = options.domdt, argpo = options.argpo, argpdot = options.argpdot, t = options.t, tc = options.tc, gsto = options.gsto, xfact = options.xfact, xlamo = options.xlamo, no = options.no;
  var atime = options.atime, em = options.em, argpm = options.argpm, inclm = options.inclm, xli = options.xli, mm = options.mm, xni = options.xni, nodem = options.nodem, nm = options.nm;
  var fasx2 = 0.13130908;
  var fasx4 = 2.8843198;
  var fasx6 = 0.37448087;
  var g22 = 5.7686396;
  var g32 = 0.95240898;
  var g44 = 1.8014998;
  var g52 = 1.050833;
  var g54 = 4.4108898;
  var rptim = 0.0043752690880113;
  var stepp = 720;
  var stepn = -720;
  var step2 = 259200;
  var delt;
  var x2li;
  var x2omi;
  var xl;
  var xldot;
  var xnddt;
  var xndt;
  var xomi;
  var dndt = 0;
  var ft = 0;
  var theta = (gsto + tc * rptim) % twoPi;
  em += dedt * t;
  inclm += didt * t;
  argpm += domdt * t;
  nodem += dnodt * t;
  mm += dmdt * t;
  if (irez !== 0) {
    if (atime === 0 || t * atime <= 0 || Math.abs(t) < Math.abs(atime)) {
      atime = 0;
      xni = no;
      xli = xlamo;
    }
    if (t > 0) {
      delt = stepp;
    } else {
      delt = stepn;
    }
    var iretn = 381;
    while (iretn === 381) {
      if (irez !== 2) {
        xndt = del1 * Math.sin(xli - fasx2) + del2 * Math.sin(2 * (xli - fasx4)) + del3 * Math.sin(3 * (xli - fasx6));
        xldot = xni + xfact;
        xnddt = del1 * Math.cos(xli - fasx2) + 2 * del2 * Math.cos(2 * (xli - fasx4)) + 3 * del3 * Math.cos(3 * (xli - fasx6));
        xnddt *= xldot;
      } else {
        xomi = argpo + argpdot * atime;
        x2omi = xomi + xomi;
        x2li = xli + xli;
        xndt = d2201 * Math.sin(x2omi + xli - g22) + d2211 * Math.sin(xli - g22) + d3210 * Math.sin(xomi + xli - g32) + d3222 * Math.sin(-xomi + xli - g32) + d4410 * Math.sin(x2omi + x2li - g44) + d4422 * Math.sin(x2li - g44) + d5220 * Math.sin(xomi + xli - g52) + d5232 * Math.sin(-xomi + xli - g52) + d5421 * Math.sin(xomi + x2li - g54) + d5433 * Math.sin(-xomi + x2li - g54);
        xldot = xni + xfact;
        xnddt = d2201 * Math.cos(x2omi + xli - g22) + d2211 * Math.cos(xli - g22) + d3210 * Math.cos(xomi + xli - g32) + d3222 * Math.cos(-xomi + xli - g32) + d5220 * Math.cos(xomi + xli - g52) + d5232 * Math.cos(-xomi + xli - g52) + 2 * (d4410 * Math.cos(x2omi + x2li - g44) + d4422 * Math.cos(x2li - g44) + d5421 * Math.cos(xomi + x2li - g54) + d5433 * Math.cos(-xomi + x2li - g54));
        xnddt *= xldot;
      }
      if (Math.abs(t - atime) >= stepp) {
        iretn = 381;
      } else {
        ft = t - atime;
        iretn = 0;
      }
      if (iretn === 381) {
        xli += xldot * delt + xndt * step2;
        xni += xndt * delt + xnddt * step2;
        atime += delt;
      }
    }
    nm = xni + xndt * ft + xnddt * ft * ft * 0.5;
    xl = xli + xldot * ft + xndt * ft * ft * 0.5;
    if (irez !== 1) {
      mm = xl - 2 * nodem + 2 * theta;
      dndt = nm - no;
    } else {
      mm = xl - nodem - argpm + theta;
      dndt = nm - no;
    }
    nm = no + dndt;
  }
  return {
    atime,
    em,
    argpm,
    inclm,
    xli,
    mm,
    xni,
    nodem,
    dndt,
    nm
  };
}
var SatRecError;
(function(SatRecError2) {
  SatRecError2[SatRecError2["None"] = 0] = "None";
  SatRecError2[SatRecError2["MeanEccentricityOutOfRange"] = 1] = "MeanEccentricityOutOfRange";
  SatRecError2[SatRecError2["MeanMotionBelowZero"] = 2] = "MeanMotionBelowZero";
  SatRecError2[SatRecError2["PerturbedEccentricityOutOfRange"] = 3] = "PerturbedEccentricityOutOfRange";
  SatRecError2[SatRecError2["SemiLatusRectumBelowZero"] = 4] = "SemiLatusRectumBelowZero";
  SatRecError2[SatRecError2["Decayed"] = 6] = "Decayed";
})(SatRecError || (SatRecError = {}));
function sgp4(satrec, tsince) {
  var coseo1;
  var sineo1;
  var cosip;
  var sinip;
  var cosisq;
  var delm;
  var delomg;
  var eo1;
  var argpm;
  var argpp;
  var su;
  var t3;
  var t4;
  var tc;
  var tem5;
  var temp;
  var tempa;
  var tempe;
  var templ;
  var inclm;
  var mm;
  var nm;
  var nodem;
  var xincp;
  var xlm;
  var mp;
  var nodep;
  var temp4 = 15e-13;
  satrec.t = tsince;
  satrec.error = SatRecError.None;
  var xmdf = satrec.mo + satrec.mdot * satrec.t;
  var argpdf = satrec.argpo + satrec.argpdot * satrec.t;
  var nodedf = satrec.nodeo + satrec.nodedot * satrec.t;
  argpm = argpdf;
  mm = xmdf;
  var t2 = satrec.t * satrec.t;
  nodem = nodedf + satrec.nodecf * t2;
  tempa = 1 - satrec.cc1 * satrec.t;
  tempe = satrec.bstar * satrec.cc4 * satrec.t;
  templ = satrec.t2cof * t2;
  if (satrec.isimp !== 1) {
    delomg = satrec.omgcof * satrec.t;
    var delmtemp = 1 + satrec.eta * Math.cos(xmdf);
    delm = satrec.xmcof * (delmtemp * delmtemp * delmtemp - satrec.delmo);
    temp = delomg + delm;
    mm = xmdf + temp;
    argpm = argpdf - temp;
    t3 = t2 * satrec.t;
    t4 = t3 * satrec.t;
    tempa = tempa - satrec.d2 * t2 - satrec.d3 * t3 - satrec.d4 * t4;
    tempe += satrec.bstar * satrec.cc5 * (Math.sin(mm) - satrec.sinmao);
    templ = templ + satrec.t3cof * t3 + t4 * (satrec.t4cof + satrec.t * satrec.t5cof);
  }
  nm = satrec.no;
  var em = satrec.ecco;
  inclm = satrec.inclo;
  if (satrec.method === "d") {
    tc = satrec.t;
    var dspaceOptions = {
      irez: satrec.irez,
      d2201: satrec.d2201,
      d2211: satrec.d2211,
      d3210: satrec.d3210,
      d3222: satrec.d3222,
      d4410: satrec.d4410,
      d4422: satrec.d4422,
      d5220: satrec.d5220,
      d5232: satrec.d5232,
      d5421: satrec.d5421,
      d5433: satrec.d5433,
      dedt: satrec.dedt,
      del1: satrec.del1,
      del2: satrec.del2,
      del3: satrec.del3,
      didt: satrec.didt,
      dmdt: satrec.dmdt,
      dnodt: satrec.dnodt,
      domdt: satrec.domdt,
      argpo: satrec.argpo,
      argpdot: satrec.argpdot,
      t: satrec.t,
      tc,
      gsto: satrec.gsto,
      xfact: satrec.xfact,
      xlamo: satrec.xlamo,
      no: satrec.no,
      atime: satrec.atime,
      em,
      argpm,
      inclm,
      xli: satrec.xli,
      mm,
      xni: satrec.xni,
      nodem,
      nm
    };
    var dspaceResult = dspace(dspaceOptions);
    em = dspaceResult.em;
    argpm = dspaceResult.argpm;
    inclm = dspaceResult.inclm;
    mm = dspaceResult.mm;
    nodem = dspaceResult.nodem;
    nm = dspaceResult.nm;
  }
  if (nm <= 0) {
    satrec.error = SatRecError.MeanMotionBelowZero;
    return null;
  }
  var am = Math.pow(xke / nm, x2o3) * tempa * tempa;
  nm = xke / Math.pow(am, 1.5);
  em -= tempe;
  if (em >= 1 || em < -1e-3) {
    satrec.error = SatRecError.MeanEccentricityOutOfRange;
    return null;
  }
  if (em < 1e-6) {
    em = 1e-6;
  }
  mm += satrec.no * templ;
  xlm = mm + argpm + nodem;
  nodem %= twoPi;
  argpm %= twoPi;
  xlm %= twoPi;
  mm = (xlm - argpm - nodem) % twoPi;
  var meanElements = {
    am,
    em,
    im: inclm,
    Om: nodem,
    om: argpm,
    mm,
    nm
  };
  var sinim = Math.sin(inclm);
  var cosim = Math.cos(inclm);
  var ep = em;
  xincp = inclm;
  argpp = argpm;
  nodep = nodem;
  mp = mm;
  sinip = sinim;
  cosip = cosim;
  if (satrec.method === "d") {
    var dpperParameters = {
      inclo: satrec.inclo,
      init: "n",
      ep,
      inclp: xincp,
      nodep,
      argpp,
      mp,
      opsmode: satrec.operationmode
    };
    var dpperResult = dpper(satrec, dpperParameters);
    ep = dpperResult.ep;
    nodep = dpperResult.nodep;
    argpp = dpperResult.argpp;
    mp = dpperResult.mp;
    xincp = dpperResult.inclp;
    if (xincp < 0) {
      xincp = -xincp;
      nodep += pi;
      argpp -= pi;
    }
    if (ep < 0 || ep > 1) {
      satrec.error = SatRecError.PerturbedEccentricityOutOfRange;
      return null;
    }
  }
  if (satrec.method === "d") {
    sinip = Math.sin(xincp);
    cosip = Math.cos(xincp);
    satrec.aycof = -0.5 * j3oj2 * sinip;
    if (Math.abs(cosip + 1) > 15e-13) {
      satrec.xlcof = -0.25 * j3oj2 * sinip * (3 + 5 * cosip) / (1 + cosip);
    } else {
      satrec.xlcof = -0.25 * j3oj2 * sinip * (3 + 5 * cosip) / temp4;
    }
  }
  var axnl = ep * Math.cos(argpp);
  temp = 1 / (am * (1 - ep * ep));
  var aynl = ep * Math.sin(argpp) + temp * satrec.aycof;
  var xl = mp + argpp + nodep + temp * satrec.xlcof * axnl;
  var u = (xl - nodep) % twoPi;
  eo1 = u;
  tem5 = 9999.9;
  var ktr = 1;
  while (Math.abs(tem5) >= 1e-12 && ktr <= 10) {
    sineo1 = Math.sin(eo1);
    coseo1 = Math.cos(eo1);
    tem5 = 1 - coseo1 * axnl - sineo1 * aynl;
    tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;
    if (Math.abs(tem5) >= 0.95) {
      if (tem5 > 0) {
        tem5 = 0.95;
      } else {
        tem5 = -0.95;
      }
    }
    eo1 += tem5;
    ktr += 1;
  }
  var ecose = axnl * coseo1 + aynl * sineo1;
  var esine = axnl * sineo1 - aynl * coseo1;
  var el2 = axnl * axnl + aynl * aynl;
  var pl = am * (1 - el2);
  if (pl < 0) {
    satrec.error = SatRecError.SemiLatusRectumBelowZero;
    return null;
  }
  var rl = am * (1 - ecose);
  var rdotl = Math.sqrt(am) * esine / rl;
  var rvdotl = Math.sqrt(pl) / rl;
  var betal = Math.sqrt(1 - el2);
  temp = esine / (1 + betal);
  var sinu = am / rl * (sineo1 - aynl - axnl * temp);
  var cosu = am / rl * (coseo1 - axnl + aynl * temp);
  su = Math.atan2(sinu, cosu);
  var sin2u = (cosu + cosu) * sinu;
  var cos2u = 1 - 2 * sinu * sinu;
  temp = 1 / pl;
  var temp1 = 0.5 * j2 * temp;
  var temp2 = temp1 * temp;
  if (satrec.method === "d") {
    cosisq = cosip * cosip;
    satrec.con41 = 3 * cosisq - 1;
    satrec.x1mth2 = 1 - cosisq;
    satrec.x7thm1 = 7 * cosisq - 1;
  }
  var mrt = rl * (1 - 1.5 * temp2 * betal * satrec.con41) + 0.5 * temp1 * satrec.x1mth2 * cos2u;
  if (mrt < 1) {
    satrec.error = SatRecError.Decayed;
    return null;
  }
  su -= 0.25 * temp2 * satrec.x7thm1 * sin2u;
  var xnode = nodep + 1.5 * temp2 * cosip * sin2u;
  var xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
  var mvt = rdotl - nm * temp1 * satrec.x1mth2 * sin2u / xke;
  var rvdot = rvdotl + nm * temp1 * (satrec.x1mth2 * cos2u + 1.5 * satrec.con41) / xke;
  var sinsu = Math.sin(su);
  var cossu = Math.cos(su);
  var snod = Math.sin(xnode);
  var cnod = Math.cos(xnode);
  var sini = Math.sin(xinc);
  var cosi = Math.cos(xinc);
  var xmx = -snod * cosi;
  var xmy = cnod * cosi;
  var ux = xmx * sinsu + cnod * cossu;
  var uy = xmy * sinsu + snod * cossu;
  var uz = sini * sinsu;
  var vx = xmx * cossu - cnod * sinsu;
  var vy = xmy * cossu - snod * sinsu;
  var vz = sini * cossu;
  var r = {
    x: mrt * ux * earthRadius,
    y: mrt * uy * earthRadius,
    z: mrt * uz * earthRadius
  };
  var v = {
    x: (mvt * ux + rvdot * vx) * vkmpersec,
    y: (mvt * uy + rvdot * vy) * vkmpersec,
    z: (mvt * uz + rvdot * vz) * vkmpersec
  };
  return {
    position: r,
    velocity: v,
    meanElements
  };
}
function sgp4init(satrecInit, options) {
  var opsmode = options.opsmode, satn = options.satn, epoch = options.epoch, xbstar = options.xbstar, xecco = options.xecco, xargpo = options.xargpo, xinclo = options.xinclo, xmo = options.xmo, xno = options.xno, xnodeo = options.xnodeo;
  var cosim;
  var sinim;
  var cc1sq;
  var cc2;
  var cc3;
  var coef;
  var coef1;
  var cosio4;
  var em;
  var emsq;
  var eeta;
  var etasq;
  var argpm;
  var nodem;
  var inclm;
  var mm;
  var nm;
  var perige;
  var pinvsq;
  var psisq;
  var qzms24;
  var s1;
  var s2;
  var s3;
  var s4;
  var s5;
  var sfour;
  var ss1;
  var ss2;
  var ss3;
  var ss4;
  var ss5;
  var sz1;
  var sz3;
  var sz11;
  var sz13;
  var sz21;
  var sz23;
  var sz31;
  var sz33;
  var tc;
  var temp;
  var temp1;
  var temp2;
  var temp3;
  var tsi;
  var xpidot;
  var xhdot1;
  var z1;
  var z3;
  var z11;
  var z13;
  var z21;
  var z23;
  var z31;
  var z33;
  var temp4 = 15e-13;
  var satrec = satrecInit;
  satrec.isimp = 0;
  satrec.method = "n";
  satrec.aycof = 0;
  satrec.con41 = 0;
  satrec.cc1 = 0;
  satrec.cc4 = 0;
  satrec.cc5 = 0;
  satrec.d2 = 0;
  satrec.d3 = 0;
  satrec.d4 = 0;
  satrec.delmo = 0;
  satrec.eta = 0;
  satrec.argpdot = 0;
  satrec.omgcof = 0;
  satrec.sinmao = 0;
  satrec.t = 0;
  satrec.t2cof = 0;
  satrec.t3cof = 0;
  satrec.t4cof = 0;
  satrec.t5cof = 0;
  satrec.x1mth2 = 0;
  satrec.x7thm1 = 0;
  satrec.mdot = 0;
  satrec.nodedot = 0;
  satrec.xlcof = 0;
  satrec.xmcof = 0;
  satrec.nodecf = 0;
  satrec.irez = 0;
  satrec.d2201 = 0;
  satrec.d2211 = 0;
  satrec.d3210 = 0;
  satrec.d3222 = 0;
  satrec.d4410 = 0;
  satrec.d4422 = 0;
  satrec.d5220 = 0;
  satrec.d5232 = 0;
  satrec.d5421 = 0;
  satrec.d5433 = 0;
  satrec.dedt = 0;
  satrec.del1 = 0;
  satrec.del2 = 0;
  satrec.del3 = 0;
  satrec.didt = 0;
  satrec.dmdt = 0;
  satrec.dnodt = 0;
  satrec.domdt = 0;
  satrec.e3 = 0;
  satrec.ee2 = 0;
  satrec.peo = 0;
  satrec.pgho = 0;
  satrec.pho = 0;
  satrec.pinco = 0;
  satrec.plo = 0;
  satrec.se2 = 0;
  satrec.se3 = 0;
  satrec.sgh2 = 0;
  satrec.sgh3 = 0;
  satrec.sgh4 = 0;
  satrec.sh2 = 0;
  satrec.sh3 = 0;
  satrec.si2 = 0;
  satrec.si3 = 0;
  satrec.sl2 = 0;
  satrec.sl3 = 0;
  satrec.sl4 = 0;
  satrec.gsto = 0;
  satrec.xfact = 0;
  satrec.xgh2 = 0;
  satrec.xgh3 = 0;
  satrec.xgh4 = 0;
  satrec.xh2 = 0;
  satrec.xh3 = 0;
  satrec.xi2 = 0;
  satrec.xi3 = 0;
  satrec.xl2 = 0;
  satrec.xl3 = 0;
  satrec.xl4 = 0;
  satrec.xlamo = 0;
  satrec.zmol = 0;
  satrec.zmos = 0;
  satrec.atime = 0;
  satrec.xli = 0;
  satrec.xni = 0;
  satrec.bstar = xbstar;
  satrec.ecco = xecco;
  satrec.argpo = xargpo;
  satrec.inclo = xinclo;
  satrec.mo = xmo;
  satrec.no = xno;
  satrec.nodeo = xnodeo;
  satrec.operationmode = opsmode;
  var ss = 78 / earthRadius + 1;
  var qzms2ttemp = (120 - 78) / earthRadius;
  var qzms2t = qzms2ttemp * qzms2ttemp * qzms2ttemp * qzms2ttemp;
  satrec.init = "y";
  satrec.t = 0;
  var initlOptions = {
    satn,
    ecco: satrec.ecco,
    epoch,
    inclo: satrec.inclo,
    no: satrec.no,
    method: satrec.method,
    opsmode: satrec.operationmode
  };
  var initlResult = initl(initlOptions);
  var ao = initlResult.ao, con42 = initlResult.con42, cosio = initlResult.cosio, cosio2 = initlResult.cosio2, eccsq = initlResult.eccsq, omeosq = initlResult.omeosq, posq = initlResult.posq, rp = initlResult.rp, rteosq = initlResult.rteosq, sinio = initlResult.sinio;
  satrec.no = initlResult.no;
  satrec.con41 = initlResult.con41;
  satrec.gsto = initlResult.gsto;
  satrec.a = Math.pow(satrec.no * tumin, -2 / 3);
  satrec.alta = satrec.a * (1 + satrec.ecco) - 1;
  satrec.altp = satrec.a * (1 - satrec.ecco) - 1;
  satrec.error = 0;
  if (omeosq >= 0 || satrec.no >= 0) {
    satrec.isimp = 0;
    if (rp < 220 / earthRadius + 1) {
      satrec.isimp = 1;
    }
    sfour = ss;
    qzms24 = qzms2t;
    perige = (rp - 1) * earthRadius;
    if (perige < 156) {
      sfour = perige - 78;
      if (perige < 98) {
        sfour = 20;
      }
      var qzms24temp = (120 - sfour) / earthRadius;
      qzms24 = qzms24temp * qzms24temp * qzms24temp * qzms24temp;
      sfour = sfour / earthRadius + 1;
    }
    pinvsq = 1 / posq;
    tsi = 1 / (ao - sfour);
    satrec.eta = ao * satrec.ecco * tsi;
    etasq = satrec.eta * satrec.eta;
    eeta = satrec.ecco * satrec.eta;
    psisq = Math.abs(1 - etasq);
    coef = qzms24 * Math.pow(tsi, 4);
    coef1 = coef / Math.pow(psisq, 3.5);
    cc2 = coef1 * satrec.no * (ao * (1 + 1.5 * etasq + eeta * (4 + etasq)) + 0.375 * j2 * tsi / psisq * satrec.con41 * (8 + 3 * etasq * (8 + etasq)));
    satrec.cc1 = satrec.bstar * cc2;
    cc3 = 0;
    if (satrec.ecco > 1e-4) {
      cc3 = -2 * coef * tsi * j3oj2 * satrec.no * sinio / satrec.ecco;
    }
    satrec.x1mth2 = 1 - cosio2;
    satrec.cc4 = 2 * satrec.no * coef1 * ao * omeosq * (satrec.eta * (2 + 0.5 * etasq) + satrec.ecco * (0.5 + 2 * etasq) - j2 * tsi / (ao * psisq) * (-3 * satrec.con41 * (1 - 2 * eeta + etasq * (1.5 - 0.5 * eeta)) + 0.75 * satrec.x1mth2 * (2 * etasq - eeta * (1 + etasq)) * Math.cos(2 * satrec.argpo)));
    satrec.cc5 = 2 * coef1 * ao * omeosq * (1 + 2.75 * (etasq + eeta) + eeta * etasq);
    cosio4 = cosio2 * cosio2;
    temp1 = 1.5 * j2 * pinvsq * satrec.no;
    temp2 = 0.5 * temp1 * j2 * pinvsq;
    temp3 = -0.46875 * j4 * pinvsq * pinvsq * satrec.no;
    satrec.mdot = satrec.no + 0.5 * temp1 * rteosq * satrec.con41 + 0.0625 * temp2 * rteosq * (13 - 78 * cosio2 + 137 * cosio4);
    satrec.argpdot = -0.5 * temp1 * con42 + 0.0625 * temp2 * (7 - 114 * cosio2 + 395 * cosio4) + temp3 * (3 - 36 * cosio2 + 49 * cosio4);
    xhdot1 = -temp1 * cosio;
    satrec.nodedot = xhdot1 + (0.5 * temp2 * (4 - 19 * cosio2) + 2 * temp3 * (3 - 7 * cosio2)) * cosio;
    xpidot = satrec.argpdot + satrec.nodedot;
    satrec.omgcof = satrec.bstar * cc3 * Math.cos(satrec.argpo);
    satrec.xmcof = 0;
    if (satrec.ecco > 1e-4) {
      satrec.xmcof = -x2o3 * coef * satrec.bstar / eeta;
    }
    satrec.nodecf = 3.5 * omeosq * xhdot1 * satrec.cc1;
    satrec.t2cof = 1.5 * satrec.cc1;
    if (Math.abs(cosio + 1) > 15e-13) {
      satrec.xlcof = -0.25 * j3oj2 * sinio * (3 + 5 * cosio) / (1 + cosio);
    } else {
      satrec.xlcof = -0.25 * j3oj2 * sinio * (3 + 5 * cosio) / temp4;
    }
    satrec.aycof = -0.5 * j3oj2 * sinio;
    var delmotemp = 1 + satrec.eta * Math.cos(satrec.mo);
    satrec.delmo = delmotemp * delmotemp * delmotemp;
    satrec.sinmao = Math.sin(satrec.mo);
    satrec.x7thm1 = 7 * cosio2 - 1;
    if (2 * pi / satrec.no >= 225) {
      satrec.method = "d";
      satrec.isimp = 1;
      tc = 0;
      inclm = satrec.inclo;
      var dscomOptions = {
        epoch,
        ep: satrec.ecco,
        argpp: satrec.argpo,
        tc,
        inclp: satrec.inclo,
        nodep: satrec.nodeo,
        np: satrec.no,
        e3: satrec.e3,
        ee2: satrec.ee2,
        peo: satrec.peo,
        pgho: satrec.pgho,
        pho: satrec.pho,
        pinco: satrec.pinco,
        plo: satrec.plo,
        se2: satrec.se2,
        se3: satrec.se3,
        sgh2: satrec.sgh2,
        sgh3: satrec.sgh3,
        sgh4: satrec.sgh4,
        sh2: satrec.sh2,
        sh3: satrec.sh3,
        si2: satrec.si2,
        si3: satrec.si3,
        sl2: satrec.sl2,
        sl3: satrec.sl3,
        sl4: satrec.sl4,
        xgh2: satrec.xgh2,
        xgh3: satrec.xgh3,
        xgh4: satrec.xgh4,
        xh2: satrec.xh2,
        xh3: satrec.xh3,
        xi2: satrec.xi2,
        xi3: satrec.xi3,
        xl2: satrec.xl2,
        xl3: satrec.xl3,
        xl4: satrec.xl4,
        zmol: satrec.zmol,
        zmos: satrec.zmos
      };
      var dscomResult = dscom(dscomOptions);
      satrec.e3 = dscomResult.e3;
      satrec.ee2 = dscomResult.ee2;
      satrec.peo = dscomResult.peo;
      satrec.pgho = dscomResult.pgho;
      satrec.pho = dscomResult.pho;
      satrec.pinco = dscomResult.pinco;
      satrec.plo = dscomResult.plo;
      satrec.se2 = dscomResult.se2;
      satrec.se3 = dscomResult.se3;
      satrec.sgh2 = dscomResult.sgh2;
      satrec.sgh3 = dscomResult.sgh3;
      satrec.sgh4 = dscomResult.sgh4;
      satrec.sh2 = dscomResult.sh2;
      satrec.sh3 = dscomResult.sh3;
      satrec.si2 = dscomResult.si2;
      satrec.si3 = dscomResult.si3;
      satrec.sl2 = dscomResult.sl2;
      satrec.sl3 = dscomResult.sl3;
      satrec.sl4 = dscomResult.sl4;
      sinim = dscomResult.sinim;
      cosim = dscomResult.cosim;
      em = dscomResult.em;
      emsq = dscomResult.emsq;
      s1 = dscomResult.s1;
      s2 = dscomResult.s2;
      s3 = dscomResult.s3;
      s4 = dscomResult.s4;
      s5 = dscomResult.s5;
      ss1 = dscomResult.ss1;
      ss2 = dscomResult.ss2;
      ss3 = dscomResult.ss3;
      ss4 = dscomResult.ss4;
      ss5 = dscomResult.ss5;
      sz1 = dscomResult.sz1;
      sz3 = dscomResult.sz3;
      sz11 = dscomResult.sz11;
      sz13 = dscomResult.sz13;
      sz21 = dscomResult.sz21;
      sz23 = dscomResult.sz23;
      sz31 = dscomResult.sz31;
      sz33 = dscomResult.sz33;
      satrec.xgh2 = dscomResult.xgh2;
      satrec.xgh3 = dscomResult.xgh3;
      satrec.xgh4 = dscomResult.xgh4;
      satrec.xh2 = dscomResult.xh2;
      satrec.xh3 = dscomResult.xh3;
      satrec.xi2 = dscomResult.xi2;
      satrec.xi3 = dscomResult.xi3;
      satrec.xl2 = dscomResult.xl2;
      satrec.xl3 = dscomResult.xl3;
      satrec.xl4 = dscomResult.xl4;
      satrec.zmol = dscomResult.zmol;
      satrec.zmos = dscomResult.zmos;
      nm = dscomResult.nm;
      z1 = dscomResult.z1;
      z3 = dscomResult.z3;
      z11 = dscomResult.z11;
      z13 = dscomResult.z13;
      z21 = dscomResult.z21;
      z23 = dscomResult.z23;
      z31 = dscomResult.z31;
      z33 = dscomResult.z33;
      var dpperOptions = {
        inclo: inclm,
        init: satrec.init,
        ep: satrec.ecco,
        inclp: satrec.inclo,
        nodep: satrec.nodeo,
        argpp: satrec.argpo,
        mp: satrec.mo,
        opsmode: satrec.operationmode
      };
      var dpperResult = dpper(satrec, dpperOptions);
      satrec.ecco = dpperResult.ep;
      satrec.inclo = dpperResult.inclp;
      satrec.nodeo = dpperResult.nodep;
      satrec.argpo = dpperResult.argpp;
      satrec.mo = dpperResult.mp;
      argpm = 0;
      nodem = 0;
      mm = 0;
      var dsinitOptions = {
        cosim,
        emsq,
        argpo: satrec.argpo,
        s1,
        s2,
        s3,
        s4,
        s5,
        sinim,
        ss1,
        ss2,
        ss3,
        ss4,
        ss5,
        sz1,
        sz3,
        sz11,
        sz13,
        sz21,
        sz23,
        sz31,
        sz33,
        t: satrec.t,
        tc,
        gsto: satrec.gsto,
        mo: satrec.mo,
        mdot: satrec.mdot,
        no: satrec.no,
        nodeo: satrec.nodeo,
        nodedot: satrec.nodedot,
        xpidot,
        z1,
        z3,
        z11,
        z13,
        z21,
        z23,
        z31,
        z33,
        ecco: satrec.ecco,
        eccsq,
        em,
        argpm,
        inclm,
        mm,
        nm,
        nodem,
        irez: satrec.irez,
        atime: satrec.atime,
        d2201: satrec.d2201,
        d2211: satrec.d2211,
        d3210: satrec.d3210,
        d3222: satrec.d3222,
        d4410: satrec.d4410,
        d4422: satrec.d4422,
        d5220: satrec.d5220,
        d5232: satrec.d5232,
        d5421: satrec.d5421,
        d5433: satrec.d5433,
        dedt: satrec.dedt,
        didt: satrec.didt,
        dmdt: satrec.dmdt,
        dnodt: satrec.dnodt,
        domdt: satrec.domdt,
        del1: satrec.del1,
        del2: satrec.del2,
        del3: satrec.del3,
        xfact: satrec.xfact,
        xlamo: satrec.xlamo,
        xli: satrec.xli,
        xni: satrec.xni
      };
      var dsinitResult = dsinit(dsinitOptions);
      satrec.irez = dsinitResult.irez;
      satrec.atime = dsinitResult.atime;
      satrec.d2201 = dsinitResult.d2201;
      satrec.d2211 = dsinitResult.d2211;
      satrec.d3210 = dsinitResult.d3210;
      satrec.d3222 = dsinitResult.d3222;
      satrec.d4410 = dsinitResult.d4410;
      satrec.d4422 = dsinitResult.d4422;
      satrec.d5220 = dsinitResult.d5220;
      satrec.d5232 = dsinitResult.d5232;
      satrec.d5421 = dsinitResult.d5421;
      satrec.d5433 = dsinitResult.d5433;
      satrec.dedt = dsinitResult.dedt;
      satrec.didt = dsinitResult.didt;
      satrec.dmdt = dsinitResult.dmdt;
      satrec.dnodt = dsinitResult.dnodt;
      satrec.domdt = dsinitResult.domdt;
      satrec.del1 = dsinitResult.del1;
      satrec.del2 = dsinitResult.del2;
      satrec.del3 = dsinitResult.del3;
      satrec.xfact = dsinitResult.xfact;
      satrec.xlamo = dsinitResult.xlamo;
      satrec.xli = dsinitResult.xli;
      satrec.xni = dsinitResult.xni;
    }
    if (satrec.isimp !== 1) {
      cc1sq = satrec.cc1 * satrec.cc1;
      satrec.d2 = 4 * ao * tsi * cc1sq;
      temp = satrec.d2 * tsi * satrec.cc1 / 3;
      satrec.d3 = (17 * ao + sfour) * temp;
      satrec.d4 = 0.5 * temp * ao * tsi * (221 * ao + 31 * sfour) * satrec.cc1;
      satrec.t3cof = satrec.d2 + 2 * cc1sq;
      satrec.t4cof = 0.25 * (3 * satrec.d3 + satrec.cc1 * (12 * satrec.d2 + 10 * cc1sq));
      satrec.t5cof = 0.2 * (3 * satrec.d4 + 12 * satrec.cc1 * satrec.d3 + 6 * satrec.d2 * satrec.d2 + 15 * cc1sq * (2 * satrec.d2 + cc1sq));
    }
  }
  sgp4(satrec, 0);
  satrec.init = "n";
}
function twoline2satrec(longstr1, longstr2) {
  var opsmode = "i";
  var error = 0;
  var satnum = longstr1.substring(2, 7);
  var epochyr = parseInt(longstr1.substring(18, 20), 10);
  var epochdays = parseFloat(longstr1.substring(20, 32));
  var ndot = parseFloat(longstr1.substring(33, 43));
  var nddot = parseFloat("".concat(longstr1.substring(44, 45), ".").concat(longstr1.substring(45, 50), "E").concat(longstr1.substring(50, 52)));
  var bstar = parseFloat("".concat(longstr1.substring(53, 54), ".").concat(longstr1.substring(54, 59), "E").concat(longstr1.substring(59, 61)));
  var inclo = parseFloat(longstr2.substring(8, 16)) * deg2rad;
  var nodeo = parseFloat(longstr2.substring(17, 25)) * deg2rad;
  var ecco = parseFloat(".".concat(longstr2.substring(26, 33).replace(/\s/g, "0")));
  var argpo = parseFloat(longstr2.substring(34, 42)) * deg2rad;
  var mo = parseFloat(longstr2.substring(43, 51)) * deg2rad;
  var no = parseFloat(longstr2.substring(52, 63)) / xpdotp;
  var year = epochyr < 57 ? epochyr + 2e3 : epochyr + 1900;
  var mdhmsResult = days2mdhms(year, epochdays);
  var mon = mdhmsResult.mon, day = mdhmsResult.day, hr = mdhmsResult.hr, minute = mdhmsResult.minute, sec = mdhmsResult.sec;
  var jdsatepoch = jday(year, mon, day, hr, minute, sec);
  var satrec = {
    error,
    satnum,
    epochyr,
    epochdays,
    ndot,
    nddot,
    bstar,
    inclo,
    nodeo,
    ecco,
    argpo,
    mo,
    no,
    jdsatepoch
  };
  sgp4init(satrec, {
    opsmode,
    satn: satrec.satnum,
    epoch: satrec.jdsatepoch - 24332815e-1,
    xbstar: satrec.bstar,
    xecco: satrec.ecco,
    xargpo: satrec.argpo,
    xinclo: satrec.inclo,
    xmo: satrec.mo,
    xno: satrec.no,
    xnodeo: satrec.nodeo
  });
  return satrec;
}
function json2satrec(jsonobj) {
  var opsmode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "i";
  var error = 0;
  var satnum = jsonobj.NORAD_CAT_ID.toString();
  var epoch = new Date(jsonobj.EPOCH.endsWith("Z") ? jsonobj.EPOCH : jsonobj.EPOCH + "Z");
  var year = epoch.getUTCFullYear();
  var epochyr = Number(year.toString().slice(-2));
  var epochdays = (epoch.valueOf() - new Date(Date.UTC(year, 0, 1, 0, 0, 0)).valueOf()) / (86400 * 1e3) + 1;
  var ndot = Number(jsonobj.MEAN_MOTION_DOT);
  var nddot = Number(jsonobj.MEAN_MOTION_DDOT);
  var bstar = Number(jsonobj.BSTAR);
  var inclo = Number(jsonobj.INCLINATION) * deg2rad;
  var nodeo = Number(jsonobj.RA_OF_ASC_NODE) * deg2rad;
  var ecco = Number(jsonobj.ECCENTRICITY);
  var argpo = Number(jsonobj.ARG_OF_PERICENTER) * deg2rad;
  var mo = Number(jsonobj.MEAN_ANOMALY) * deg2rad;
  var no = Number(jsonobj.MEAN_MOTION) / xpdotp;
  var mdhmsResult = days2mdhms(year, epochdays);
  var mon = mdhmsResult.mon, day = mdhmsResult.day, hr = mdhmsResult.hr, minute = mdhmsResult.minute, sec = mdhmsResult.sec;
  var jdsatepoch = jday(year, mon, day, hr, minute, sec);
  var satrec = {
    error,
    satnum,
    epochyr,
    epochdays,
    ndot,
    nddot,
    bstar,
    inclo,
    nodeo,
    ecco,
    argpo,
    mo,
    no,
    jdsatepoch
  };
  sgp4init(satrec, {
    opsmode,
    satn: satrec.satnum,
    epoch: satrec.jdsatepoch - 24332815e-1,
    xbstar: satrec.bstar,
    xecco: satrec.ecco,
    xargpo: satrec.argpo,
    xinclo: satrec.inclo,
    xmo: satrec.mo,
    xno: satrec.no,
    xnodeo: satrec.nodeo
  });
  return satrec;
}
function propagate(satrec) {
  for (var _len = arguments.length, jdayArgs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    jdayArgs[_key - 1] = arguments[_key];
  }
  var j = jday.apply(void 0, jdayArgs);
  var m = (j - satrec.jdsatepoch) * minutesPerDay;
  return sgp4(satrec, m);
}
function eciToGeodetic(eci, gmst) {
  var a = 6378.137;
  var b = 6356.7523142;
  var R = Math.sqrt(eci.x * eci.x + eci.y * eci.y);
  var f = (a - b) / a;
  var e2 = 2 * f - f * f;
  var longitude = Math.atan2(eci.y, eci.x) - gmst;
  while (longitude < -pi) {
    longitude += twoPi;
  }
  while (longitude > pi) {
    longitude -= twoPi;
  }
  var kmax = 20;
  var k = 0;
  var latitude = Math.atan2(eci.z, Math.sqrt(eci.x * eci.x + eci.y * eci.y));
  var C;
  while (k++ < kmax) {
    C = 1 / Math.sqrt(1 - e2 * (Math.sin(latitude) * Math.sin(latitude)));
    latitude = Math.atan2(eci.z + a * C * e2 * Math.sin(latitude), R);
  }
  var height = R / Math.cos(latitude) - a * C;
  return {
    longitude,
    latitude,
    height
  };
}

// scripts/maplibre-feeds.src.mjs
var api = (path, opts) => fetch(path, opts).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});
function pickLatLon(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 3) return null;
  for (const [latK, lonK] of [["latitude", "longitude"], ["lat", "lon"], ["lat", "lng"]]) {
    if (Number.isFinite(obj[latK]) && Number.isFinite(obj[lonK])) return [obj[lonK], obj[latK]];
  }
  for (const v of Object.values(obj)) {
    const hit = pickLatLon(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}
function fc(features) {
  return { type: "FeatureCollection", features };
}
function point(coords, props) {
  return { type: "Feature", geometry: { type: "Point", coordinates: coords }, properties: props };
}
async function fires() {
  const d = await api("/api/firms");
  const rows = d.fires || [];
  const stride = Math.max(1, Math.ceil(rows.length / 2e4));
  const features = [];
  for (let i = 0; i < rows.length; i += stride) {
    const f = rows[i];
    if (!Number.isFinite(f.lat) || !Number.isFinite(f.lon)) continue;
    features.push(point([f.lon, f.lat], {
      name: `${f.satellite} ${f.instrument} FRP ${Math.round(f.frp || 0)}`,
      _icon: "hazard-fire",
      frp: f.frp,
      brightness: f.brightness,
      daynight: f.daynight,
      acq: `${f.acqDate} ${f.acqTime}`
    }));
  }
  return { features: fc(features), raw: rows.length, shown: features.length };
}
function coordMean(node, acc, depth = 0) {
  if (!node || depth > 6) return acc;
  if (typeof node[0] === "number" && typeof node[1] === "number") {
    acc[0] += node[0];
    acc[1] += node[1];
    acc[2] += 1;
    return acc;
  }
  if (Array.isArray(node)) for (const child of node) coordMean(child, acc, depth + 1);
  return acc;
}
async function perimeters() {
  const d = await api("/api/fire-perimeters");
  const rows = d.rows || [];
  const features = [];
  for (const r of rows) {
    const mean = coordMean(r.polygons || r.geometry || r.rings, [0, 0, 0]);
    const c = pickLatLon(r) || (mean[2] ? [mean[0] / mean[2], mean[1] / mean[2]] : null);
    if (!c) continue;
    features.push(point(c, {
      name: r.name || r.stableId,
      _icon: "hazard-fire",
      acres: r.acres,
      state: r.state,
      category: r.category,
      detail: `${r.county ? r.county + ", " : ""}${r.state || ""} \xB7 ${r.acres ?? "?"} acres`
    }));
  }
  return { features: fc(features), raw: rows.length };
}
async function cyclones() {
  const d = await api("/api/cyclones");
  const storms = d.storms || [];
  const features = storms.map((s) => point([s.position.longitude, s.position.latitude], {
    name: `${s.classification} ${s.name}`,
    _icon: "hazard-cyclone",
    detail: `${s.windKt} kt \xB7 ${s.pressureHpa} hPa \xB7 moving ${s.movement.directionDegrees}\xB0 @ ${s.movement.speedKt} kt`,
    advisory: s.advisoryNumber
  }));
  return { features: fc(features), raw: storms.length };
}
async function launches() {
  const d = await api("/api/launches");
  const features = [];
  for (const r of d.results || []) {
    const c = pickLatLon(r.pad || r.location || r);
    if (!c) continue;
    const when = r.window_start || r.net || "";
    features.push(point(c, {
      name: r.name,
      _icon: "launch",
      detail: `${r.status?.name || r.status || ""} \xB7 ${String(when).slice(0, 16).replace("T", " ")}`
    }));
  }
  return { features: fc(features), raw: d.results?.length || 0 };
}
function ommToTle(o) {
  const norad = String(o.NORAD_CAT_ID ?? "").padStart(5, "0");
  const epoch = new Date(o.EPOCH);
  const start = Date.UTC(epoch.getUTCFullYear(), 0, 1);
  const doy = (epoch.getTime() - start) / 864e5 + 1;
  const yy = String(epoch.getUTCFullYear()).slice(2);
  const epochField = yy + doy.toFixed(8).padStart(12, "0");
  const ecc = String(Math.max(0, Math.floor((o.ECCENTRICITY || 0) * 1e7))).padStart(7, "0");
  const f = (v, w, d) => Number(v || 0).toFixed(d).padStart(w, "0");
  const line1 = "1 " + norad + "U " + String(o.OBJECT_ID ?? "").padEnd(8).slice(0, 8) + " " + epochField + "  .00000000  00000-0  00000-0 0  999";
  const line2 = "2 " + norad + " " + f(o.INCLINATION, 8, 4) + " " + f(o.RA_OF_ASC_NODE, 8, 4) + " " + ecc + " " + f(o.ARG_OF_PERICENTER, 8, 4) + " " + f(o.MEAN_ANOMALY, 8, 4) + " " + f(o.MEAN_MOTION, 11, 8) + "00000";
  return { name: o.OBJECT_NAME, line1, line2 };
}
var TLE_GROUPS = [
  ["stations", 60],
  // ISS, stations
  ["gps-ops", 400],
  // GPS constellation — the GNSS the user asks about
  ["active", 1500]
  // full active catalog (starlink group 502s on the proxy)
];
async function satellites() {
  const features = [];
  let raw = 0;
  const parseTle = (body) => {
    const out = [];
    const rows = body.split("\n").map((l) => l.trimEnd()).filter(Boolean);
    for (let i = 0; i + 1 < rows.length; i += 3) {
      const l1 = rows[i + 1] || "", l2 = rows[i + 2] || "";
      if (!/^1 /.test(l1) || !/^2 /.test(l2)) continue;
      const rec = twoline2satrec(l1, l2);
      if (rec) out.push([rows[i], rec]);
    }
    return out;
  };
  for (const [group, cap] of TLE_GROUPS) {
    let satrecs = [];
    try {
      const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`);
      if (r.ok) satrecs = parseTle(await r.text());
    } catch {
    }
    if (!satrecs.length) {
      try {
        const r2 = await fetch(`/api/celestrak/${group}`);
        if (r2.ok) {
          const body = await r2.text();
          const arr = body.trim().startsWith("[") ? JSON.parse(body) : [];
          const named = [];
          for (const o of arr) {
            const t = ommToTle(o);
            named.push(t.name, t.line1, t.line2);
          }
          satrecs = parseTle(named.join("\n"));
        }
      } catch {
        continue;
      }
    }
    raw += satrecs.length;
    const stride = Math.max(1, Math.ceil(satrecs.length / cap));
    const now = /* @__PURE__ */ new Date();
    const gmst = gstime(now);
    for (let i = 0; i < satrecs.length; i += stride) {
      const [name, rec] = satrecs[i];
      try {
        const pv = propagate(rec, now);
        if (!pv?.position) continue;
        const g = eciToGeodetic(pv.position, gmst);
        const lat = g.latitude * 180 / Math.PI, lon = g.longitude * 180 / Math.PI;
        features.push(point([lon, lat], {
          name: name.replace(/^0 /, "").trim(),
          _icon: "satellite",
          detail: `${group} \xB7 ${Math.round(g.height)} km`
        }));
      } catch {
      }
    }
  }
  return { features: fc(features), raw };
}
async function cctv() {
  const d = await api("/api/cctv/sources");
  const rows = d.sources || [];
  const features = rows.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon)).map((c) => point([c.lon, c.lat], {
    name: c.name || c.id,
    _icon: "cctv",
    camera_id: c.id,
    feed_type: c.feedType || "",
    license: c.license || "",
    detail: `${c.city || ""} \xB7 ${c.provider || ""}`
  }));
  return { features: fc(features), raw: rows.length };
}
async function radio() {
  const d = await api("/api/radio/stations");
  const rows = d.stations || [];
  const features = rows.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).map((s) => point([s.lon, s.lat], {
    name: s.name,
    _icon: "radio",
    stream_url: s.streamUrl || "",
    homepage: s.homepage || "",
    country: s.country || "",
    codec: s.codec || "",
    bitrate: s.bitrate || "",
    detail: (s.tags || []).slice(0, 3).join(", ")
  }));
  return { features: fc(features), raw: rows.length };
}
async function transit() {
  const feeds = (await api("/api/transit/feeds")).feeds || [];
  const features = [];
  let raw = 0;
  for (const feed of feeds) {
    try {
      const d = await api(`/api/transit/vehicles/${encodeURIComponent(feed.id)}`);
      for (const v of d.vehicles || []) {
        if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
        raw++;
        features.push(point([v.lon, v.lat], {
          name: `${feed.name} ${v.label || v.routeId || v.id}`,
          _icon: "transit",
          detail: `${feed.region || feed.name} \xB7 ${v.status || ""}`
        }));
      }
    } catch {
    }
  }
  return { features: fc(features), raw, feeds: feeds.length };
}
async function bikeshare() {
  const registry = await Promise.resolve().then(() => (init_registry(), registry_exports));
  const cities = registry.GBFS_CITY_REGISTRY || [];
  const features = [];
  let raw = 0;
  for (const city of cities.slice(0, 8)) {
    const infoUrl = city.stationInformationUrl || city.infoUrl;
    if (!infoUrl) continue;
    try {
      const d = await api("/api/gbfs/" + encodeURIComponent(infoUrl));
      const stations = d?.data?.stations || d?.stations || [];
      for (const s of stations) {
        if (!Number.isFinite(s.lat) && !Number.isFinite(s.latitude)) continue;
        raw++;
        const lat = s.lat ?? s.latitude, lon = s.lon ?? s.longitude;
        features.push(point([lon, lat], {
          name: s.name || s.station_name || city.id,
          _icon: "bike",
          detail: city.id || ""
        }));
      }
    } catch {
    }
  }
  return { features: fc(features), raw };
}
async function vessels() {
  const d = await api("/api/vessels");
  const rows = d.rows || d.vessels || d || [];
  const features = [];
  for (const v of Array.isArray(rows) ? rows : []) {
    const c = pickLatLon(v);
    if (!c) continue;
    features.push(point(c, {
      name: v.name || v.mmsi || v.reference,
      _icon: "vessel",
      detail: `${v.type || ""} \xB7 ${v.destination || ""}`
    }));
  }
  return { features: fc(features), raw: features.length };
}
async function installations(rawBox) {
  const cx = Number.isFinite(rawBox.west) && Number.isFinite(rawBox.east) ? (rawBox.west + rawBox.east) / 2 : 0;
  const cy = Number.isFinite(rawBox.south) && Number.isFinite(rawBox.north) ? (rawBox.south + rawBox.north) / 2 : 30;
  const bbox = {
    // The endpoint accepts small boxes (verified 2 deg); a 10 deg box is refused.
    west: cx - 2.5,
    east: cx + 2.5,
    south: cy - 2.5,
    north: cy + 2.5
  };
  const q = new URLSearchParams(Object.entries({
    south: bbox.south.toFixed(5),
    west: bbox.west.toFixed(5),
    north: bbox.north.toFixed(5),
    east: bbox.east.toFixed(5)
  }));
  const d = await api(`/api/military-installations?${q}`);
  if (d.error) return { features: fc([]), raw: 0, note: String(d.error).slice(0, 40) };
  const rows = d.rows || d.sites || d.results || [];
  const features = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const c = pickLatLon(r);
    if (!c) continue;
    features.push(point(c, { name: r.name || r.id, _icon: "install", detail: r.type || "" }));
  }
  return { features: fc(features), raw: rows.length };
}
async function route(a, b, profile = "driving") {
  const coords = `${a[0].toFixed(5)},${a[1].toFixed(5)};${b[0].toFixed(5)},${b[1].toFixed(5)}`;
  return api(`/api/route?profile=${encodeURIComponent(profile)}&coords=${encodeURIComponent(coords)}&steps=1`);
}
async function bhotePlaces() {
  const mod = await Promise.resolve().then(() => (init_bhoteKoshiIncidentPlaces(), bhoteKoshiIncidentPlaces_exports));
  const list = mod.INCIDENT_OVERVIEW_PLACES || [];
  const features = [];
  for (const p of list) {
    const c = Number.isFinite(p.lat) && Number.isFinite(p.lon) ? [p.lon, p.lat] : pickLatLon(p);
    if (!c) continue;
    features.push(point(c, { name: p.title || p.id, _icon: "launch", detail: "Bhote Koshi" }));
  }
  return { features: fc(features), raw: list.length };
}
async function windArrows() {
  const m = await api("/api/wind/manifest?model=gfs");
  const G = m.grid || {};
  const width = G.nx || m.width || m.cols || 0;
  const height = G.ny || m.height || m.rows || 0;
  if (!width || !height || !m.gridUrl) return { features: fc([]), raw: 0, note: "no grid" };
  const buf = await (await fetch(m.gridUrl)).arrayBuffer();
  const expected = width * height * 2;
  if (buf.byteLength !== expected * 4 && buf.byteLength !== expected * 2) {
    return { features: fc([]), raw: 0, note: `format ${buf.byteLength}!=${expected * 4}` };
  }
  const f32 = buf.byteLength === expected * 4 ? new Float32Array(buf) : null;
  const i16 = f32 ? null : new Int16Array(buf);
  const scale = i16 ? 0.01 : 1;
  const features = [];
  for (let y = 0; y < height; y += Math.ceil(height / 30)) {
    for (let x = 0; x < width; x += Math.ceil(width / 60)) {
      const i = (y * width + x) * 2;
      const u = (f32 ? f32[i] : i16[i]) * scale;
      const v = (f32 ? f32[i + 1] : i16[i + 1]) * scale;
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
      const lon = (G.lo1 ?? 0) + x * (G.dx ?? 1);
      const lat = (G.la1 ?? 90) - y * (G.dy ?? 1);
      const dir = Math.atan2(u, v) * 180 / Math.PI;
      features.push(point([lon, lat], {
        _icon: "wind",
        rotate: (dir + 360) % 360,
        speed: Math.round(Math.hypot(u, v) * 10) / 10,
        detail: `${m.cycle?.validIso || ""}`
      }));
    }
  }
  return { features: fc(features), raw: features.length };
}
async function military() {
  const d = await api("/api/military");
  const rows = d.ac || d.aircraft || [];
  const features = [];
  for (const a of rows) {
    if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
    features.push(point([a.lon, a.lat], {
      name: String(a.flight || a.r || a.hex || "").trim() || "Military aircraft",
      _icon: "aircraft-mil",
      rotate: Number.isFinite(a.track) ? a.track : 0,
      type: a.t || "",
      altitude_ft: a.alt_baro ?? "",
      speed_kt: a.gs ?? "",
      hex: a.hex || "",
      detail: `${a.t || "type not reported"} \xB7 ${a.alt_baro ?? "?"} ft \xB7 ${a.gs ?? "?"} kt`
    }));
  }
  return { features: fc(features), raw: rows.length };
}
var SATELLITE_GROUPS = Object.freeze([
  { tag: "stations", path: "stations" },
  { tag: "visual", path: "visual" },
  { tag: "gps-ops", path: "gps-ops" },
  { tag: "glonass", path: "glo-ops" },
  { tag: "galileo", path: "galileo" },
  { tag: "geo", path: "geo" }
]);
var satCache = { core: null, dense: null };
async function readGroups(groups) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const perGroup = {};
  const results = await Promise.all(groups.map(async (g) => {
    try {
      const r = await fetch(`/api/celestrak/${g.path}`);
      if (!r.ok) return { g, rows: [] };
      const body = await r.text();
      return { g, rows: body.trim().startsWith("[") ? JSON.parse(body) : [] };
    } catch {
      return { g, rows: [] };
    }
  }));
  for (const { g, rows } of results) {
    perGroup[g.tag] = rows.length;
    for (const o of rows) {
      let rec = null;
      try {
        rec = json2satrec(o);
      } catch {
        rec = null;
      }
      if (!rec || rec.error) continue;
      const id = Number(rec.satnum);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, name: String(o.OBJECT_NAME || id), group: g.tag, rec, intl: o.OBJECT_ID || "" });
    }
  }
  return { list: out, perGroup };
}
var SATELLITE_CLASS = Object.freeze({
  stations: { klass: "STATION", color: "#fff6e5", size: 9 },
  visual: { klass: "VISUAL", color: "#9fb3c4", size: 7 },
  "gps-ops": { klass: "NAV \xB7 GPS", color: "#4fd8ff", size: 7 },
  glonass: { klass: "NAV \xB7 GLONASS", color: "#4fd8ff", size: 7 },
  galileo: { klass: "NAV \xB7 GALILEO", color: "#4fd8ff", size: 7 },
  geo: { klass: "GEO", color: "#c89bff", size: 7 },
  starlink: { klass: "COMMS \xB7 STARLINK", color: "#54697f", size: 3 }
});
var ISS_NORAD = 25544;
function satFeatures(list, now = /* @__PURE__ */ new Date()) {
  const gmst = gstime(now);
  const features = [];
  for (const s of list) {
    try {
      const pv = propagate(s.rec, now);
      if (!pv?.position) continue;
      const g = eciToGeodetic(pv.position, gmst);
      const iss = Number(s.id) === ISS_NORAD;
      const cls = iss ? { klass: "STATION \xB7 ISS", color: "#ff4444", size: 14 } : SATELLITE_CLASS[s.group] || SATELLITE_CLASS.visual;
      features.push(point([g.longitude * 180 / Math.PI, g.latitude * 180 / Math.PI], {
        name: s.name,
        _icon: "satellite",
        norad: s.id,
        group: s.group,
        class_label: cls.klass,
        _color: cls.color,
        _size: cls.size,
        _iss: iss ? 1 : 0,
        altitude_km: Math.round(g.height),
        intl_designator: s.intl || "",
        detail: `${cls.klass} \xB7 ${Math.round(g.height)} km \xB7 NORAD ${s.id}`
      }));
    } catch {
    }
  }
  return fc(features);
}
async function satellitesCore() {
  if (!satCache.core) satCache.core = await readGroups(SATELLITE_GROUPS);
  return { features: satFeatures(satCache.core.list), raw: satCache.core.list.length, perGroup: satCache.core.perGroup };
}
function satellitesCoreTick() {
  return satCache.core ? satFeatures(satCache.core.list) : null;
}
function satellitesCoreRefresh() {
  satCache.core = null;
}
async function satellitesDense() {
  if (!satCache.dense) satCache.dense = await readGroups([{ tag: "starlink", path: "starlink" }]);
  return { features: satFeatures(satCache.dense.list), raw: satCache.dense.list.length };
}
function satellitesDenseTick() {
  return satCache.dense ? satFeatures(satCache.dense.list) : null;
}
var HAZARD_SUMMARY = "/src/data/local_data/hospitals/global/caregap-hazard-global.summary.json";
async function globalSatellites() {
  const r = await fetch(HAZARD_SUMMARY + "?t=" + Date.now());
  const t = await r.text();
  if (!r.ok || !t.trimStart().startsWith("{")) throw new Error("hazard summary unavailable");
  const hz = JSON.parse(t);
  const raw = Array.isArray(hz.top_facilities_diverse) && hz.top_facilities_diverse.length ? hz.top_facilities_diverse : Array.isArray(hz.top_facilities) ? hz.top_facilities : [];
  const corridors = raw.filter((f) => {
    if (!f || !Number.isFinite(Number(f.lat)) || !Number.isFinite(Number(f.lon))) return false;
    if (f.hazard === "wildfire") {
      const sev = Number(f.severity) || 0;
      const ev = String(f.event || "");
      const near5 = Number((ev.match(/(\d+)\s*fires<=5km/) || [])[1]) || 0;
      const near25 = Number((ev.match(/(\d+)<=25km/) || [])[1]) || 0;
      if (sev < 0.25 && near5 < 2 && near25 < 5) return false;
    }
    return true;
  }).slice(0, 25);
  const seen = /* @__PURE__ */ new Set();
  const items = corridors.filter((c) => {
    const k = c.iso2 || "\u2014";
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 12);
  const features = items.map((c, i) => point([Number(c.lon), Number(c.lat)], {
    name: c.name || "Healthcare facility",
    rank: i + 1,
    iso2: c.iso2 || "\u2014",
    hazard: c.hazard || "hazard",
    severity: Number(c.severity) || 0,
    event: `${c.event || ""} \xB7 live N2YO all-catalog sweep on open`,
    _icon: "satellite",
    site_id: `sat-${c.id || i}`
  }));
  return { features: fc(features), raw: features.length, items: features.map((f) => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })), generatedAt: hz.generated_at || null };
}
async function n2yoAbove(lat, lon) {
  return api(`/api/n2yo/above?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
}
async function satelliteOrbits() {
  if (!satCache.core) satCache.core = await readGroups(SATELLITE_GROUPS);
  const pick = satCache.core.list.filter((s) => s.group === "stations" || s.group === "gps-ops" || s.group === "galileo" || s.group === "glonass");
  const features = [];
  const now = Date.now();
  for (const s of pick) {
    const periodMin = 2 * Math.PI / (s.rec.no || 0.06);
    const steps = 120;
    let seg = [];
    let prevLon = null;
    for (let i = 0; i <= steps; i++) {
      const t = new Date(now + i / steps * periodMin * 6e4);
      try {
        const pv = propagate(s.rec, t);
        if (!pv?.position) continue;
        const g = eciToGeodetic(pv.position, gstime(t));
        const lon = g.longitude * 180 / Math.PI, lat = g.latitude * 180 / Math.PI;
        if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
          if (seg.length > 1) features.push({ type: "Feature", geometry: { type: "LineString", coordinates: seg }, properties: { name: s.name, group: s.group, norad: s.id } });
          seg = [];
        }
        seg.push([lon, lat]);
        prevLon = lon;
      } catch {
        break;
      }
    }
    if (seg.length > 1) features.push({ type: "Feature", geometry: { type: "LineString", coordinates: seg }, properties: { name: s.name, group: s.group, norad: s.id } });
  }
  return { features: fc(features), raw: pick.length };
}
function ringsFrom(node) {
  if (!Array.isArray(node) || !node.length) return [];
  if (typeof node[0]?.[0] === "number") return [[node]];
  if (typeof node[0]?.[0]?.[0] === "number") return [node];
  if (typeof node[0]?.[0]?.[0]?.[0] === "number") return node;
  return [];
}
async function perimeterPolygons() {
  const d = await api("/api/fire-perimeters");
  const rows = d.rows || [];
  const polys = [];
  const pts = [];
  for (const r of rows) {
    const props = {
      name: r.name || r.stableId,
      acres: r.acres ?? null,
      contained_pct: r.containedPct ?? null,
      state: r.state || "",
      county: r.county || "",
      category: r.category || "",
      cause: r.cause || "",
      discovered: r.discoveredTime ? new Date(r.discoveredTime).toISOString().slice(0, 10) : "",
      updated: r.updatedTime ? new Date(r.updatedTime).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "",
      _icon: "hazard-fire",
      detail: `${r.county ? r.county + ", " : ""}${r.state || ""} \xB7 ${r.acres ?? "acres not reported"} acres \xB7 ${r.containedPct ?? "?"}% contained`
    };
    const geo = ringsFrom(r.polygons || r.rings || []);
    if (geo.length) polys.push({ type: "Feature", geometry: { type: "MultiPolygon", coordinates: geo }, properties: props });
    const mean = coordMean(r.polygons || r.rings, [0, 0, 0]);
    if (mean[2]) pts.push(point([mean[0] / mean[2], mean[1] / mean[2]], props));
  }
  return { polygons: fc(polys), points: fc(pts), raw: rows.length };
}
async function cyclonesFull() {
  const d = await api("/api/cyclones");
  const storms = d.storms || [];
  const centers = [], tracks = [], cones = [], fpts = [];
  for (const s of storms) {
    const nm = `${s.classification || ""} ${s.name || ""}`.trim();
    if (s.position) centers.push(point([s.position.longitude, s.position.latitude], {
      name: nm,
      _icon: "hazard-cyclone",
      advisory: s.advisoryNumber ?? "",
      detail: `${s.windKt ?? "?"} kt \xB7 ${s.pressureHpa ?? "?"} hPa \xB7 moving ${s.movement?.directionDegrees ?? "?"}\xB0 @ ${s.movement?.speedKt ?? "?"} kt`
    }));
    if (s.track) tracks.push({ type: "Feature", geometry: s.track, properties: { name: nm } });
    if (s.cone) cones.push({ type: "Feature", geometry: s.cone, properties: { name: nm, note: "Forecast center-track uncertainty, not storm size" } });
    for (const p of s.forecastPoints || []) {
      const c = pickLatLon(p) || (Array.isArray(p.coordinates) ? p.coordinates : null);
      if (c) fpts.push(point(c, { name: `${nm} +${p.leadHours ?? p.tau ?? "?"} h`, _icon: "hazard-cyclone", detail: p.label || "" }));
    }
  }
  return { centers: fc(centers), tracks: fc(tracks), cones: fc(cones), forecast: fc(fpts), raw: storms.length, coverage: d.coverage || "" };
}
async function windStreamlines() {
  const m = await api("/api/wind/manifest?model=gfs");
  const G = m.grid || {};
  const W = G.nx || 0, H = G.ny || 0;
  if (!W || !H || !m.gridUrl) return { features: fc([]), raw: 0, note: "no grid" };
  const buf = await (await fetch(m.gridUrl)).arrayBuffer();
  const n = W * H * 2;
  const f32 = buf.byteLength === n * 4 ? new Float32Array(buf) : null;
  const i16 = !f32 && buf.byteLength === n * 2 ? new Int16Array(buf) : null;
  if (!f32 && !i16) return { features: fc([]), raw: 0, note: "format" };
  const sc = i16 ? 0.01 : 1;
  const lo1 = G.lo1 ?? 0, la1 = G.la1 ?? 90, dx = G.dx ?? 1, dy = G.dy ?? 1;
  const uv = (lon, lat) => {
    let x = ((lon - lo1) % 360 + 360) % 360 / dx;
    const y = (la1 - lat) / dy;
    if (y < 0 || y > H - 1) return null;
    const x0 = Math.floor(x) % W, y0 = Math.floor(y), x1 = (x0 + 1) % W, y1 = Math.min(H - 1, y0 + 1);
    const fx = x - Math.floor(x), fy = y - y0;
    const at = (xx, yy, k) => (f32 ? f32[(yy * W + xx) * 2 + k] : i16[(yy * W + xx) * 2 + k]) * sc;
    const lerp = (k) => (at(x0, y0, k) * (1 - fx) + at(x1, y0, k) * fx) * (1 - fy) + (at(x0, y1, k) * (1 - fx) + at(x1, y1, k) * fx) * fy;
    const u = lerp(0), v = lerp(1);
    return Number.isFinite(u) && Number.isFinite(v) ? [u, v] : null;
  };
  const features = [];
  for (let lat = -70; lat <= 70; lat += 5) {
    for (let lon = -180; lon < 180; lon += 6) {
      const line = [[lon, lat]];
      let p = [lon, lat], speedSum = 0;
      for (let k = 0; k < 18; k++) {
        const a = uv(p[0], p[1]);
        if (!a) break;
        const h = 0.35;
        const mid = [p[0] + a[0] * h / Math.max(0.2, Math.cos(p[1] * Math.PI / 180)) / 2, p[1] + a[1] * h / 2];
        const b = uv(mid[0], mid[1]);
        if (!b) break;
        const q = [p[0] + b[0] * h / Math.max(0.2, Math.cos(p[1] * Math.PI / 180)), p[1] + b[1] * h];
        if (Math.abs(q[0] - p[0]) > 20) break;
        speedSum += Math.hypot(b[0], b[1]);
        line.push(q);
        p = q;
      }
      if (line.length > 3) features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: line },
        properties: { speed: Math.round(speedSum / (line.length - 1) * 10) / 10, valid: m.cycle?.validIso || "" }
      });
    }
  }
  return { features: fc(features), raw: features.length, valid: m.cycle?.validIso || "" };
}
async function bhoteEvent() {
  const e = await (await fetch("/events/bhote-koshi-2026/event.json")).json();
  const corridor = (e.reconstruction?.corridor || []).filter((c) => Number.isFinite(c.lon) && Number.isFinite(c.lat)).map((c) => [c.lon, c.lat]);
  const lines = corridor.length > 1 ? [{
    type: "Feature",
    geometry: { type: "LineString", coordinates: corridor },
    properties: { name: e.reconstruction?.label || "Schematic downstream progression", note: e.reconstruction?.caveat || "" }
  }] : [];
  const pts = [];
  for (const w of e.witnessAnchors || []) {
    if (Number.isFinite(w.lat) && Number.isFinite(w.lon)) pts.push(point([w.lon, w.lat], {
      name: w.title,
      _icon: "bhote",
      url: w.sourceUrl || "",
      provenance: w.provenance || "",
      detail: (w.details || []).join(" \xB7 ")
    }));
  }
  for (const s of e.evidenceSpine || []) {
    if (Number.isFinite(s.lat) && Number.isFinite(s.lon)) pts.push(point([s.lon, s.lat], {
      name: `${s.sequence ?? ""}. ${s.title || s.id}`.trim(),
      _icon: "bhote",
      phase: s.phase || "",
      url: s.sourceUrl || s.url || s.media?.url || "",
      detail: s.summary || "",
      captured: s.timing?.capturedAt || "Not reported"
    }));
  }
  return { lines: fc(lines), points: fc(pts), imagery: e.imagery || null, title: e.title, observedDate: e.observedDate, raw: pts.length };
}
async function bhoteLocator() {
  const fp = await Promise.resolve().then(() => (init_bhoteKoshiFloodPath(), bhoteKoshiFloodPath_exports));
  const places = await bhotePlaces();
  const path = (fp.BHOTE_KOSHI_FLOOD_PATH || []).map((p) => [p[0], p[1]]);
  for (const f of places.features.features) f.properties._icon = "bhote";
  return { line: fc(path.length > 1 ? [{
    type: "Feature",
    geometry: { type: "LineString", coordinates: path },
    properties: { name: "Bhote Koshi river centreline (GeoPera, CC BY-NC 4.0)" }
  }] : []), points: places.features, raw: places.raw };
}
async function freshAsset(path) {
  try {
    const r = await fetch(path, { method: "HEAD" });
    const type = r.headers.get("content-type") || "";
    if (r.ok && !/text\/html/i.test(type)) return path;
  } catch {
  }
  return null;
}
if (typeof window !== "undefined") window.__feeds = { fires, perimeters, cyclones, launches, satellites, cctv, radio, transit, bikeshare, vessels, installations, route, bhotePlaces, windArrows, military, satellitesCore, satellitesDense, satelliteOrbits, perimeterPolygons, cyclonesFull, windStreamlines, bhoteEvent, bhoteLocator, globalSatellites, n2yoAbove };
export {
  SATELLITE_CLASS,
  SATELLITE_GROUPS,
  bhoteEvent,
  bhoteLocator,
  bhotePlaces,
  bikeshare,
  cctv,
  cyclones,
  cyclonesFull,
  fires,
  freshAsset,
  globalSatellites,
  installations,
  launches,
  military,
  n2yoAbove,
  perimeterPolygons,
  perimeters,
  radio,
  route,
  satelliteOrbits,
  satellites,
  satellitesCore,
  satellitesCoreRefresh,
  satellitesCoreTick,
  satellitesDense,
  satellitesDenseTick,
  transit,
  vessels,
  windArrows,
  windStreamlines
};
