export const DEFAULT_PITCH_ID = 'terrain-principal';

export const pitchOptions = [
  {
    id: 'terrain(1)',
    label: 'Terrain L\'ocean',
    location: 'Avenue de la Mer, 75001 RABAT',
    city: 'RABAT'
  },
  {
    id: 'Ecole EL IDRISSI',
    label: 'Terrain EL IDRISSI',
    location: 'Avenue du Stade, 69002 RABAT',
    city: 'RABAT'
  }
 
];

export const getPitchById = (pitchId) => {
  return pitchOptions.find((pitch) => pitch.id === pitchId) || pitchOptions[0];
};

export const formatPitchLocation = (pitch) => {
  if (!pitch) return '';

  return `${pitch.label} - ${pitch.location}`;
};

export const getTerrainList = (location) => {
  if (!location || typeof location !== 'string') {
    return [];
  }

  return location
    .split(/\n|;/)
    .map((item) => item.replace(/\r/g, '').trim())
    .filter(Boolean);
};

export const getLocationText = (location) => {
  const terrainList = getTerrainList(location);

  if (terrainList.length === 0) {
    return '';
  }

  const firstTerrain = terrainList[0];

  if (firstTerrain.includes(' - ')) {
    return firstTerrain.split(' - ').slice(1).join(' - ').trim();
  }

  return firstTerrain;
};

export const getGoogleMapsDirectionsUrl = (destination, origin = null) => {
  const encodedDestination = encodeURIComponent(destination || '');

  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${encodedDestination}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodedDestination}`;
};
