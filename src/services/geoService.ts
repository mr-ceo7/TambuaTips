export async function detectUserCountry(): Promise<string | null> {
  // Check if we already cached the country
  const cached = localStorage.getItem('user_geo_country');
  if (cached) return cached;
  
  try {
    const response = await fetch('https://api.country.is/');
    const data = await response.json();
    if (data && data.country) {
      localStorage.setItem('user_geo_country', data.country);
      return data.country;
    }
  } catch (error) {
    console.error('Failed to detect user country via IP', error);
  }
  
  return null;
}
