// BackEnd/seed/seedTailors.js
require("dotenv").config();
const connectDB = require("../config/db");
const Tailor = require("../models/Tailor");

const tailors = [
  {
    id: 1,
    name: "Rajesh Kumar",
    city: "Mumbai",
    area: "Andheri West",
    experienceYears: 15,
    startingPrice: 800,
    specializations: ["Saree Blouse", "Lehenga", "Alterations"],
    about:
      "Specialist in bridal blouses and lehengas with detailed handwork and perfect fitting.",
    rating: 4.8,
    gender: "male",
    services: [
      {
        title: "Bridal Saree Blouse Stitching",
        priceFrom: 1200,
        duration: "7–10 days",
        description:
          "Heavy bridal blouses with hand embroidery, padding and perfect fitting for wedding functions.",
      },
      {
        title: "Party Wear Blouse Stitching",
        priceFrom: 800,
        duration: "5–7 days",
        description:
          "Designer blouses with stylish neck and sleeve patterns for parties and receptions.",
      },
      {
        title: "Lehenga Stitching",
        priceFrom: 3200,
        duration: "10–14 days",
        description:
          "Custom lehenga stitching with can-can, lining and detailed finishing for bridal and festive wear.",
      },
      {
        title: "Quick Alterations",
        priceFrom: 200,
        duration: "1–2 days",
        description:
          "Minor size adjustments, length corrections and fitting fixes for existing garments.",
      },
    ],
  },
  {
    id: 2,
    name: "Priya Sharma",
    city: "Delhi",
    area: "Lajpat Nagar",
    experienceYears: 8,
    startingPrice: 1200,
    specializations: ["Kurta / Suits", "Designer Wear", "Gowns / Dresses"],
    about:
      "Creates modern ethnic and Indo-western outfits with a focus on comfort and clean silhouettes.",
    rating: 4.9,
    gender: "female",
    services: [
      {
        title: "Designer Salwar Suit Stitching",
        priceFrom: 1300,
        duration: "5–7 days",
        description:
          "Custom salwar suits with trendy necklines, sleeve styles and comfortable fits.",
      },
      {
        title: "Indo-Western Gown Stitching",
        priceFrom: 2500,
        duration: "7–10 days",
        description:
          "Floor-length gowns with fusion designs suitable for cocktails and receptions.",
      },
      {
        title: "Kurta & Pant Set Stitching",
        priceFrom: 1500,
        duration: "5–8 days",
        description:
          "Well-fitted straight kurtas with matching pants or palazzos for office and events.",
      },
      {
        title: "Custom Designer Wear Consultation",
        priceFrom: 500,
        duration: "1–2 days",
        description:
          "Design consultation with sketch suggestions and fabric guidance for special occasions.",
      },
    ],
  },
  {
    id: 3,
    name: "Mohammed Ali",
    city: "Hyderabad",
    area: "Charminar",
    experienceYears: 12,
    startingPrice: 1500,
    specializations: ["Sherwani", "Traditional Wear", "Embroidery"],
    about:
      "Known for regal sherwanis and traditional menswear with intricate embroidery and rich fabrics.",
    rating: 4.7,
    gender: "male",
    services: [
      {
        title: "Wedding Sherwani Stitching",
        priceFrom: 4500,
        duration: "12–18 days",
        description:
          "Heavily embroidered sherwanis with custom fitting for grooms and close family.",
      },
      {
        title: "Simple Sherwani / Pathani Set",
        priceFrom: 2500,
        duration: "7–10 days",
        description:
          "Elegant sherwanis and pathani sets for nikah, engagements and festive functions.",
      },
      {
        title: "Embroidery Work (Kurta & Sherwani)",
        priceFrom: 1200,
        duration: "5–7 days",
        description: "Hand and machine embroidery on collars, cuffs and front panels.",
      },
      {
        title: "Traditional Kurta Pajama Set",
        priceFrom: 1500,
        duration: "5–7 days",
        description: "Classic kurta pajama stitching with comfortable yet royal look.",
      },
    ],
  },
  {
    id: 4,
    name: "Neha Verma",
    city: "Bengaluru",
    area: "Indiranagar",
    experienceYears: 7,
    startingPrice: 1000,
    specializations: ["Lehenga", "Gowns / Dresses", "Party Wear"],
    about:
      "Designs elegant lehengas and evening gowns with a contemporary touch for events and parties.",
    rating: 4.6,
    gender: "female",
    services: [
      {
        title: "Cocktail Gown Stitching",
        priceFrom: 2800,
        duration: "10–14 days",
        description:
          "Flowy gowns with modern cuts, ruffles and drapes for cocktail nights and parties.",
      },
      {
        title: "Light Lehenga Stitching",
        priceFrom: 2200,
        duration: "8–12 days",
        description:
          "Lightweight lehengas suitable for mehendi, sangeet and festive functions.",
      },
      {
        title: "Party Wear Dress Stitching",
        priceFrom: 1500,
        duration: "5–7 days",
        description:
          "Knee-length and midi dresses with trendy silhouettes for birthdays and outings.",
      },
    ],
  },
  {
    id: 5,
    name: "Manav Mehta",
    city: "Ahmedabad",
    area: "Navrangpura",
    experienceYears: 10,
    startingPrice: 900,
    specializations: ["Men's Suits", "Formal Wear", "Blazers"],
    about:
      "Tailors sharp, well-fitted suits and blazers for office, functions and special occasions.",
    rating: 4.5,
    gender: "male",
    services: [
      {
        title: "Two-Piece Suit Stitching",
        priceFrom: 3500,
        duration: "10–14 days",
        description: "Custom tailored suits for office wear, meetings and interviews.",
      },
      {
        title: "Three-Piece Suit Stitching",
        priceFrom: 4500,
        duration: "12–16 days",
        description: "Full three-piece suits with waistcoat, ideal for receptions and events.",
      },
      {
        title: "Blazer Stitching",
        priceFrom: 2500,
        duration: "7–10 days",
        description: "Single and double-breasted blazers with precise fitting and neat finishing.",
      },
      {
        title: "Formal Trouser Stitching",
        priceFrom: 900,
        duration: "4–6 days",
        description: "Well-fitted formal trousers with clean creases and comfortable waistbands.",
      },
    ],
  },
  {
    id: 6,
    name: "Meera Tailor",
    city: "Pune",
    area: "Kothrud",
    experienceYears: 9,
    startingPrice: 700,
    specializations: ["Saree Blouse", "Kids Wear", "Alterations"],
    about:
      "Offers neatly finished blouses, kidswear and quick alterations with reliable turnaround time.",
    rating: 4.6,
    gender: "female",
    services: [
      {
        title: "Daily Wear Blouse Stitching",
        priceFrom: 600,
        duration: "3–5 days",
        description: "Comfortable daily wear blouses with simple and neat finishing.",
      },
      {
        title: "Kids Frock / Dress Stitching",
        priceFrom: 800,
        duration: "4–6 days",
        description: "Cute and comfortable dresses, frocks and sets for kids of all ages.",
      },
      {
        title: "School Uniform Stitching",
        priceFrom: 750,
        duration: "5–7 days",
        description: "Properly measured school uniforms for kids with durable stitching.",
      },
      {
        title: "Quick Alterations",
        priceFrom: 150,
        duration: "1–2 days",
        description: "Pant length, waist tightening, blouse and kurta fitting adjustments.",
      },
    ],
  },
  {
    id: 7,
    name: "Ankit Singh",
    city: "Lucknow",
    area: "Hazratganj",
    experienceYears: 11,
    startingPrice: 1100,
    specializations: ["Sherwani", "Kurta / Suits", "Pathani"],
    about:
      "Focuses on traditional menswear with royal sherwanis and well-fitted kurtas for weddings and festivals.",
    rating: 4.7,
    gender: "male",
    services: [
      {
        title: "Wedding Sherwani Stitching",
        priceFrom: 4200,
        duration: "12–16 days",
        description: "Rich sherwanis with traditional Lucknowi styling for weddings and receptions.",
      },
      {
        title: "Pathani Set Stitching",
        priceFrom: 1800,
        duration: "5–8 days",
        description: "Comfortable pathani suits with relaxed yet smart fits.",
      },
      {
        title: "Kurta Pajama Set",
        priceFrom: 1400,
        duration: "5–7 days",
        description: "Classic kurta pajama sets ideal for poojas and family functions.",
      },
    ],
  },
  {
    id: 8,
    name: "Sonal Desai",
    city: "Surat",
    area: "Adajan",
    experienceYears: 6,
    startingPrice: 850,
    specializations: ["Lehenga", "Saree Blouse", "Garba Chaniya Choli"],
    about:
      "Popular for colourful Navratri outfits and stylish lehengas with comfortable fits.",
    rating: 4.5,
    gender: "female",
    services: [
      {
        title: "Garba Chaniya Choli Stitching",
        priceFrom: 1800,
        duration: "7–10 days",
        description:
          "Bright, flared chaniya cholis specially designed for Navratri with mirror work and borders.",
      },
      {
        title: "Navratri Lehenga Stitching",
        priceFrom: 2200,
        duration: "8–12 days",
        description: "Light and heavy lehengas with traditional Gujarati styling.",
      },
      {
        title: "Designer Blouse Stitching",
        priceFrom: 900,
        duration: "4–6 days",
        description: "Festive blouses with trendy backs, tassels and dori designs.",
      },
    ],
  },
  {
    id: 9,
    name: "Vikram Jain",
    city: "Jaipur",
    area: "Vaishali Nagar",
    experienceYears: 13,
    startingPrice: 1300,
    specializations: ["Bandhgala", "Sherwani", "Formal Wear"],
    about:
      "Blends Rajasthani royal style with modern cuts for bandhgala suits and sherwanis.",
    rating: 4.8,
    gender: "male",
    services: [
      {
        title: "Bandhgala Suit Stitching",
        priceFrom: 3800,
        duration: "10–14 days",
        description: "Royal bandhgala suits with Rajasthani detailing for receptions and formal events.",
      },
      {
        title: "Sherwani Stitching",
        priceFrom: 4200,
        duration: "12–16 days",
        description: "Elegant sherwanis with subtle embroidery and premium fabrics.",
      },
      {
        title: "Formal Shirt & Trouser Combo",
        priceFrom: 2000,
        duration: "7–10 days",
        description: "Custom formal shirts and trousers tailored to your measurements.",
      },
    ],
  },
  {
    id: 10,
    name: "Ayesha Khan",
    city: "Hyderabad",
    area: "Banjara Hills",
    experienceYears: 5,
    startingPrice: 950,
    specializations: ["Abaya", "Gowns / Dresses", "Party Wear"],
    about:
      "Designs modest yet stylish outfits including abayas and evening gowns with soft drapes.",
    rating: 4.4,
    gender: "female",
    services: [
      {
        title: "Everyday Abaya Stitching",
        priceFrom: 1200,
        duration: "5–7 days",
        description: "Comfortable abayas with simple cuts suitable for daily wear.",
      },
      {
        title: "Embellished Abaya Stitching",
        priceFrom: 1800,
        duration: "7–10 days",
        description: "Abayas with lace, embroidery and subtle embellishments for special occasions.",
      },
      {
        title: "Evening Gown Stitching",
        priceFrom: 2600,
        duration: "10–14 days",
        description: "Soft, flowy gowns with modest necklines and graceful drapes.",
      },
    ],
  },
  {
    id: 11,
    name: "Ritu Malhotra",
    city: "Chandigarh",
    area: "Sector 17",
    experienceYears: 14,
    startingPrice: 1000,
    specializations: ["Designer Wear", "Lehenga", "Saree Blouse"],
    about:
      "Experienced designer known for bridal trousseau, reception gowns and heavy designer blouses.",
    rating: 4.9,
    gender: "female",
    services: [
      {
        title: "Bridal Lehenga Stitching",
        priceFrom: 5000,
        duration: "15–20 days",
        description: "Premium bridal lehengas with heavy work, can-can and full finishing.",
      },
      {
        title: "Heavy Designer Blouse Stitching",
        priceFrom: 1600,
        duration: "7–10 days",
        description: "Blouses with intricate work, suitable for bridal and reception sarees.",
      },
      {
        title: "Reception Gown Stitching",
        priceFrom: 3200,
        duration: "12–16 days",
        description: "Elegant Western and Indo-western gowns for receptions and cocktail nights.",
      },
    ],
  },
  {
    id: 12,
    name: "Karthik Iyer",
    city: "Chennai",
    area: "T. Nagar",
    experienceYears: 9,
    startingPrice: 800,
    specializations: ["Formal Shirts", "Office Wear", "Alterations"],
    about:
      "Specialises in crisp office shirts and trousers with clean cuts and neat finishing.",
    rating: 4.3,
    gender: "male",
    services: [
      {
        title: "Formal Shirt Stitching",
        priceFrom: 900,
        duration: "4–6 days",
        description: "Office shirts with sharp collars and perfect sleeve lengths.",
      },
      {
        title: "Office Trouser Stitching",
        priceFrom: 950,
        duration: "5–7 days",
        description: "Trousers with clean cuts and comfortable waist fits for daily office wear.",
      },
      {
        title: "Alterations (Shirts & Trousers)",
        priceFrom: 200,
        duration: "1–2 days",
        description: "Length adjustments, waist tightening and general fitting corrections.",
      },
    ],
  },
  {
    id: 13,
    name: "Pooja Patil",
    city: "Mumbai",
    area: "Dadar",
    experienceYears: 7,
    startingPrice: 750,
    specializations: ["Saree Blouse", "Salwar Suit", "Kids Wear"],
    about:
      "Creates comfortable daily wear suits and stylish blouses for working women and students.",
    rating: 4.4,
    gender: "female",
    services: [
      {
        title: "Daily Wear Salwar Suit Stitching",
        priceFrom: 900,
        duration: "4–6 days",
        description: "Simple and comfortable salwar suits for everyday and office use.",
      },
      {
        title: "College & Office Blouse Stitching",
        priceFrom: 650,
        duration: "3–5 days",
        description: "Blouses with practical yet stylish designs for regular saree wearers.",
      },
      {
        title: "Kids Wear Sets",
        priceFrom: 800,
        duration: "4–6 days",
        description: "Comfortable frocks, tops and sets for kids with soft finishing.",
      },
    ],
  },
  {
    id: 14,
    name: "Farhan Shaikh",
    city: "Pune",
    area: "Viman Nagar",
    experienceYears: 4,
    startingPrice: 650,
    specializations: ["Casual Shirts", "Jeans Alteration", "Streetwear"],
    about:
      "Young tailor who focuses on trendy streetwear, casual shirts and perfect denim alterations.",
    rating: 4.2,
    gender: "male",
    services: [
      {
        title: "Casual Shirt Stitching",
        priceFrom: 800,
        duration: "4–6 days",
        description: "Trendy casual shirts with slim fits and modern styling.",
      },
      {
        title: "Jeans Alteration",
        priceFrom: 250,
        duration: "1–3 days",
        description: "Length, waist and taper adjustments for denim and casual trousers.",
      },
      {
        title: "Streetwear Co-ord Sets",
        priceFrom: 1400,
        duration: "6–9 days",
        description: "Matching co-ord sets with relaxed fits and streetwear aesthetics.",
      },
    ],
  },
  {
    id: 15,
    name: "Shraddha Joshi",
    city: "Nagpur",
    area: "Dharampeth",
    experienceYears: 10,
    startingPrice: 900,
    specializations: ["Lehenga", "Gowns / Dresses", "Bridal Wear"],
    about:
      "Known for graceful bridal lehengas and reception gowns with balanced flair and comfort.",
    rating: 4.7,
    gender: "female",
    services: [
      {
        title: "Bridal Lehenga Stitching",
        priceFrom: 4800,
        duration: "15–20 days",
        description: "Graceful bridal lehengas with balanced flair, can-can and detailed finishing.",
      },
      {
        title: "Engagement / Sangeet Gown",
        priceFrom: 3000,
        duration: "12–16 days",
        description: "Gowns with modern silhouettes and comfortable movement.",
      },
      {
        title: "Bridesmaid Lehenga Stitching",
        priceFrom: 2600,
        duration: "10–14 days",
        description: "Coordinated yet unique lehengas for bridesmaids and close family.",
      },
    ],
  },
  {
    id: 16,
    name: "Deepak Yadav",
    city: "Noida",
    area: "Sector 62",
    experienceYears: 6,
    startingPrice: 850,
    specializations: ["Men's Suits", "Blazers", "Formal Wear"],
    about:
      "Offers made-to-measure suits and blazers for corporate events, interviews and functions.",
    rating: 4.5,
    gender: "male",
    services: [
      {
        title: "Corporate Suit Stitching",
        priceFrom: 3400,
        duration: "10–14 days",
        description: "Professional suits tailored for corporate environments and client meetings.",
      },
      {
        title: "Blazer with Trouser Set",
        priceFrom: 3800,
        duration: "12–16 days",
        description: "Coordinated blazer and trouser sets with precise fitting.",
      },
      {
        title: "Formal Shirt Stitching",
        priceFrom: 900,
        duration: "4–6 days",
        description: "Neat formal shirts suitable for office and events.",
      },
    ],
  },
  {
    id: 17,
    name: "Nazia Siddiqui",
    city: "Bhopal",
    area: "Arera Colony",
    experienceYears: 8,
    startingPrice: 700,
    specializations: ["Salwar Suit", "Saree Blouse", "Daily Wear"],
    about:
      "Focuses on comfortable daily and office wear with simple yet elegant designs.",
    rating: 4.3,
    gender: "female",
    services: [
      {
        title: "Office Salwar Suit Stitching",
        priceFrom: 850,
        duration: "4–6 days",
        description: "Simple, easy-to-maintain suits perfect for office-goers.",
      },
      {
        title: "Daily Wear Blouse Stitching",
        priceFrom: 550,
        duration: "3–5 days",
        description: "Soft, practical blouses with minimal maintenance.",
      },
      {
        title: "Straight Kurti Stitching",
        priceFrom: 700,
        duration: "4–6 days",
        description: "Straight kurtis suitable for daily and semi-formal use.",
      },
    ],
  },
  {
    id: 18,
    name: "Harsh Patel",
    city: "Vadodara",
    area: "Alkapuri",
    experienceYears: 5,
    startingPrice: 900,
    specializations: ["Kurta / Suits", "Nehru Jacket", "Festive Wear"],
    about:
      "Creates festive kurta sets and Nehru jackets that are popular for poojas and family functions.",
    rating: 4.4,
    gender: "male",
    services: [
      {
        title: "Festive Kurta Pajama Stitching",
        priceFrom: 1400,
        duration: "5–8 days",
        description: "Bright kurtas with neat finishing for festive occasions.",
      },
      {
        title: "Nehru Jacket Stitching",
        priceFrom: 1800,
        duration: "7–10 days",
        description: "Nehru jackets that pair well with kurtas and shirts.",
      },
      {
        title: "Kurta + Nehru Jacket Set",
        priceFrom: 2600,
        duration: "10–14 days",
        description: "Complete festive set tailored to your measurements.",
      },
    ],
  },
  {
    id: 19,
    name: "Simran Kaur",
    city: "Ludhiana",
    area: "Model Town",
    experienceYears: 11,
    startingPrice: 950,
    specializations: ["Palazzo Suit", "Anarkali", "Lehenga"],
    about:
      "Specialises in flowy Anarkalis, palazzo suits and Punjabi-style lehengas with rich fabrics.",
    rating: 4.6,
    gender: "female",
    services: [
      {
        title: "Anarkali Suit Stitching",
        priceFrom: 1600,
        duration: "7–10 days",
        description: "Flared Anarkali suits with rich ghera and perfect flair.",
      },
      {
        title: "Palazzo Suit Stitching",
        priceFrom: 1300,
        duration: "5–7 days",
        description: "Comfortable palazzo suits with stylish kurtas.",
      },
      {
        title: "Punjabi Lehenga Stitching",
        priceFrom: 2600,
        duration: "10–14 days",
        description: "Punjabi-style lehengas with heavy borders and traditional looks.",
      },
    ],
  },
  {
    id: 20,
    name: "Arjun Nair",
    city: "Kochi",
    area: "Kadavanthra",
    experienceYears: 9,
    startingPrice: 1000,
    specializations: ["Men's Suits", "Wedding Wear", "Formal Shirts"],
    about:
      "Offers tailored suits and formal shirts with subtle South-Indian styling for weddings and events.",
    rating: 4.7,
    gender: "male",
    services: [
      {
        title: "Wedding Suit Stitching",
        priceFrom: 3800,
        duration: "10–14 days",
        description: "Wedding suits with subtle South-Indian styling and premium fabrics.",
      },
      {
        title: "Formal Shirt Stitching",
        priceFrom: 950,
        duration: "4–6 days",
        description: "Formal shirts tailored for both office and events.",
      },
      {
        title: "Semi-Formal Blazer",
        priceFrom: 2600,
        duration: "7–10 days",
        description: "Blazers that work for office dinners, receptions and parties.",
      },
    ],
  },
];

async function seed() {
  await connectDB();

  // dev only: reset collection
  await Tailor.deleteMany({});
  await Tailor.insertMany(tailors);

  console.log(`✅ Tailors seeded successfully: ${tailors.length}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
