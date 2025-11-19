// BackEnd/models/dataStore.js

// TEMPORARY IN-MEMORY DATA
// Later we can replace this with a real database (MongoDB, SQL, etc.)

// Users: customers, tailors, admins
// NOTE: password is plain text NOW (for learning),
// later we will hash it using bcrypt.
const users = [];

// Tailors: profiles used for "Find Tailors" + "Tailor Profile" pages
const tailors = [
  {
    id: 1,
    name: "Rajesh Kumar",
    city: "Mumbai",
    experienceYears: 15,
    startingPrice: 800,
    specializations: ["Saree Blouse", "Lehenga", "Alterations"],
    about: "Specialist in bridal blouses and lehengas.",
    rating: 4.8
  },
  {
    id: 2,
    name: "Priya Sharma",
    city: "Delhi",
    experienceYears: 8,
    startingPrice: 1200,
    specializations: ["Kurta", "Suits", "Designer Wear"],
    about: "Modern ethnic wear with a focus on fit and comfort.",
    rating: 4.9
  }
];

let nextUserId = 1;
let nextTailorId = tailors.length + 1;

module.exports = {
  users,
  tailors,
  nextIds: {
    getNextUserId: () => nextUserId++,
    getNextTailorId: () => nextTailorId++
  }
};
