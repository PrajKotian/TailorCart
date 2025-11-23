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
    area: "",
    gender: "male",
    profileImageUrl: "", // for seed we use frontend mapping by name
    experienceYears: 15,
    startingPrice: 800,
    specializations: ["Saree Blouse", "Lehenga", "Alterations"],
    about: "Specialist in bridal blouses and lehengas.",
    rating: 4.8,
    services: [
      {
        title: "Saree Blouse Stitching",
        priceFrom: 800,
        duration: "5–7 days",
        description:
          "Padded, non-padded, designer necklines, embroidered sleeves and more."
      },
      {
        title: "Lehenga Stitching",
        priceFrom: 2500,
        duration: "10–14 days",
        description:
          "Bridal and party lehengas with custom flare, cancan, and embroidered borders."
      },
      {
        title: "Alterations & Fitting",
        priceFrom: 300,
        duration: "2–3 days", 
        description:
          "Waist, length, sleeve adjustments, zipper replacements, and minor repairs."
      },
      {
        title: "Custom Design Consultation",
        priceFrom: null,
        duration: "By appointment",
        description:
          "Discuss design ideas, fabrics, and finish for your perfect outfit."
      }
    ]
  },
  {
    id: 2,
    name: "Priya Sharma",
    city: "Delhi",
    area: "",
    gender: "female",
    profileImageUrl: "",
    experienceYears: 8,
    startingPrice: 1200,
    specializations: ["Kurta", "Suits", "Designer Wear"],
    about: "Modern ethnic wear with a focus on fit and comfort.",
    rating: 4.9,
    services: [
      {
        title: "Kurta / Suit Stitching",
        priceFrom: 1200,
        duration: "5–7 days",
        description:
          "Custom-fit kurtas and suits for daily wear, office, and occasions."
      },
      {
        title: "Designer Blouse & Gowns",
        priceFrom: 1500,
        duration: "7–10 days",
        description:
          "Contemporary blouse and gown designs with focus on modern cuts."
      },
      {
        title: "Alterations",
        priceFrom: 300,
        duration: "2–3 days",
        description:
          "Length, waist and sleeve corrections for women’s ethnic wear."
      }
    ]
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
