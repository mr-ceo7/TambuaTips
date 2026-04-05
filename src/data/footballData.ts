export const POPULAR_LEAGUES = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Champions League',
  'Europa League',
  'Conference League',
  'Eredivisie',
  'Primeira Liga',
  'Championship',
  'FA Cup',
  'Carabao Cup',
  'MLS',
  'Saudi Pro League',
  'Scottish Premiership'
];

export const TEAMS_BY_LEAGUE: Record<string, string[]> = {
  'Premier League': [
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Burnley', 
    'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool', 'Luton Town', 
    'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 
    'Sheffield United', 'Tottenham', 'West Ham', 'Wolves', 'Southampton', 'Leicester', 'Leeds'
  ],
  'La Liga': [
    'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Girona', 'Athletic Club', 
    'Real Sociedad', 'Real Betis', 'Valencia', 'Villarreal', 'Sevilla', 
    'Osasuna', 'Alaves', 'Celta Vigo', 'Getafe', 'Mallorca', 'Las Palmas'
  ],
  'Serie A': [
    'Inter Milan', 'AC Milan', 'Juventus', 'Bologna', 'Roma', 'Atalanta', 
    'Napoli', 'Fiorentina', 'Lazio', 'Torino', 'Monza', 'Genoa', 'Sassuolo'
  ],
  'Bundesliga': [
    'Bayer Leverkusen', 'Bayern Munich', 'VfB Stuttgart', 'RB Leipzig', 
    'Borussia Dortmund', 'Eintracht Frankfurt', 'Freiburg', 'Augsburg', 
    'Hoffenheim', 'Werder Bremen', 'Borussia Monchengladbach'
  ],
  'Ligue 1': [
    'PSG', 'Monaco', 'Brest', 'Lille', 'Nice', 'Lens', 'Rennes', 
    'Marseille', 'Lyon', 'Toulouse', 'Reims', 'Montpellier'
  ],
  'Eredivisie': [
    'PSV', 'Feyenoord', 'Twente', 'AZ Alkmaar', 'Ajax', 'Sparta Rotterdam'
  ],
  'Primeira Liga': [
    'Sporting CP', 'Benfica', 'Porto', 'Braga', 'Vitoria de Guimaraes'
  ]
};

// Flattened list for fallback searching when league is "Other" or unknown
export const ALL_POPULAR_TEAMS = Array.from(new Set(Object.values(TEAMS_BY_LEAGUE).flat())).sort();
