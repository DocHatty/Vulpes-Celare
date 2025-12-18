/**
 * MASTER TEST SUITE - Location Data
 * Geographic data for address generation
 */

const CITIES = [
  // Major US Cities
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
  "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
  "Fort Worth", "Columbus", "Indianapolis", "Charlotte", "San Francisco",
  "Seattle", "Denver", "Boston", "El Paso", "Nashville", "Detroit",
  "Oklahoma City", "Portland", "Las Vegas", "Memphis", "Louisville",
  "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento",
  "Kansas City", "Atlanta", "Miami", "Raleigh", "Omaha", "Minneapolis",
  "Cleveland", "Tulsa", "Oakland", "Tampa", "Honolulu", "Anchorage",
  "Pittsburgh", "Cincinnati", "St. Louis", "New Orleans", "Lexington",
  
  // Smaller cities for diversity
  "Boulder", "Savannah", "Charleston", "Asheville", "Santa Fe", "Eugene",
  "Madison", "Burlington", "Providence", "Worcester", "Springfield",
  "Hartford", "Stamford", "Bridgeport", "New Haven", "Trenton", "Camden",
  "Wilmington", "Newark", "Jersey City", "Hoboken", "Paterson", "Yonkers",
  "Syracuse", "Rochester", "Buffalo", "Albany", "Binghamton", "Ithaca"
];

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

const STATE_NAMES = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
  "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
  "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
  "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
  "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
  "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
  "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
  "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
  "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
  "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
  "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
};

const STREET_TYPES = [
  "Street", "Avenue", "Boulevard", "Drive", "Lane", "Road", "Way",
  "Place", "Court", "Circle", "Terrace", "Trail", "Parkway", "Highway",
  "Pike", "Alley", "Path", "Run", "Crossing", "Loop", "Pass", "Ridge",
  "Square", "Plaza", "Commons", "Point", "Heights", "Meadows", "Gardens"
];

const STREET_NAMES = [
  // Trees
  "Oak", "Maple", "Cedar", "Pine", "Elm", "Birch", "Willow", "Hickory",
  "Spruce", "Magnolia", "Dogwood", "Poplar", "Sycamore", "Chestnut", "Beech",
  "Walnut", "Cherry", "Aspen", "Juniper", "Cypress",
  
  // Presidents/Historical
  "Washington", "Lincoln", "Jefferson", "Madison", "Monroe", "Adams",
  "Jackson", "Kennedy", "Roosevelt", "Wilson", "Grant", "Lee",
  
  // Geographic
  "Lake", "Hill", "Forest", "River", "Spring", "Valley", "Meadow",
  "Mountain", "Creek", "Brook", "Ridge", "Summit", "Canyon", "Harbor",
  
  // Directional
  "North", "South", "East", "West", "Central", "Main", "Front", "Back",
  
  // Common
  "Church", "School", "Mill", "Center", "Park", "Market", "Commerce",
  "Industrial", "College", "University", "Hospital", "Airport", "Station",
  
  // Ordinal
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh",
  "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth"
];

const UNIT_TYPES = [
  "Apt", "Apartment", "Suite", "Ste", "Unit", "Floor", "Fl",
  "Building", "Bldg", "#", "Room", "Rm", "Space", "Lot"
];

module.exports = {
  CITIES,
  STATES,
  STATE_NAMES,
  STREET_TYPES,
  STREET_NAMES,
  UNIT_TYPES
};
