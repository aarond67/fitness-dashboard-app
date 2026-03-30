export const mealPlanSeed = {
  "controls": {
    "startingWeight": 238,
    "goalWeeklyLoss": 2,
    "maintenance": 2700,
    "dailyWorkoutAddon": 250,
    "workoutsPerWeek": 5,
    "proteinFactor": 0.9,
    "calorieFloor": 1800
  },
  "recipes": [
    {
      "id": "breakfast-bowl",
      "name": "Breakfast Bowl",
      "ingredients": "1 cup oats, 1 cup water, 1 cup egg whites, 2 eggs, 1 cup Greek yogurt",
      "steps": "Microwave oats 2\u20133 min. Scramble egg whites + eggs 4\u20135 min. Serve Greek yogurt on the side."
    },
    {
      "id": "taco-chicken-bowl",
      "name": "Taco Chicken Bowl",
      "ingredients": "Chicken, rice, broccoli, taco seasoning, salsa",
      "steps": "Season chicken, bake at 400\u00b0F for 20\u201325 min, serve over rice with broccoli and salsa."
    },
    {
      "id": "lemon-garlic-bowl",
      "name": "Lemon Garlic Bowl",
      "ingredients": "Chicken, rice, broccoli, lemon juice, garlic powder, salt",
      "steps": "Season chicken, bake, and serve with rice and broccoli."
    },
    {
      "id": "spicy-chicken-bowl",
      "name": "Spicy Chicken Bowl",
      "ingredients": "Chicken, rice, broccoli, hot sauce, chili flakes",
      "steps": "Season chicken, bake, then top with hot sauce and chili flakes."
    },
    {
      "id": "garlic-paprika-bowl",
      "name": "Garlic Paprika Bowl",
      "ingredients": "Chicken, rice, broccoli, garlic powder, paprika, salt, pepper",
      "steps": "Season chicken, bake, and serve with rice and broccoli."
    },
    {
      "id": "herb-chicken-bowl",
      "name": "Herb Chicken Bowl",
      "ingredients": "Chicken, rice, mixed vegetables, Italian seasoning",
      "steps": "Season chicken, bake, and serve with rice and vegetables."
    },
    {
      "id": "buffalo-chicken-bowl",
      "name": "Buffalo Chicken Bowl",
      "ingredients": "Chicken, rice, broccoli, buffalo sauce",
      "steps": "Bake chicken, toss in buffalo sauce, serve with rice and broccoli."
    },
    {
      "id": "salt-pepper-beef",
      "name": "Salt & Pepper Beef Plate",
      "ingredients": "93% lean beef, potatoes, vegetables, salt, pepper, garlic powder",
      "steps": "Brown beef 6\u20138 min, cook potatoes, serve with vegetables."
    }
  ],
  "grocery": [
    [
      "Chicken breast",
      "3.6 lb",
      "Used on 6 of 7 days"
    ],
    [
      "93% lean ground beef",
      "0.4 lb",
      "Salt & Pepper day"
    ],
    [
      "Egg whites",
      "7 cups",
      "1 cup per day"
    ],
    [
      "Eggs",
      "14 eggs",
      "2 per day"
    ],
    [
      "Greek yogurt",
      "7 cups",
      "1 cup per day"
    ],
    [
      "Oats",
      "7 cups",
      "1 cup per day"
    ],
    [
      "Rice",
      "9 cups cooked",
      "Used on 6 of 7 days"
    ],
    [
      "Potatoes",
      "0.7 lb",
      "Salt & Pepper day"
    ],
    [
      "Broccoli / mixed veg",
      "7 cups",
      "1 cup per day"
    ],
    [
      "Protein powder",
      "7 scoops",
      "1 scoop per day"
    ]
  ],
  "starterMeals": [
    {
      "id": "monday-breakfast",
      "name": "Breakfast Bowl",
      "calories": 600,
      "protein": 57,
      "recipe": "Oats 1 cup cooked with water; scramble egg whites 1 cup + 2 eggs; Greek yogurt 1 cup on the side",
      "category": "breakfast"
    },
    {
      "id": "monday-dinner",
      "name": "Taco Chicken Bowl",
      "calories": 1159,
      "protein": 132,
      "recipe": "Chicken 9.5 oz + rice 1.5 cup + broccoli 1 cup + taco seasoning + salsa",
      "category": "dinner"
    },
    {
      "id": "tuesday-dinner",
      "name": "Lemon Garlic Bowl",
      "calories": 1159,
      "protein": 132,
      "recipe": "Chicken 9.5 oz + rice 1.5 cup + broccoli 1 cup + lemon juice + garlic",
      "category": "dinner"
    },
    {
      "id": "wednesday-dinner",
      "name": "Spicy Chicken Bowl",
      "calories": 1159,
      "protein": 132,
      "recipe": "Chicken 9.5 oz + rice 1.5 cup + broccoli 1 cup + hot sauce + chili flakes",
      "category": "dinner"
    },
    {
      "id": "thursday-dinner",
      "name": "Garlic Paprika Bowl",
      "calories": 1159,
      "protein": 132,
      "recipe": "Chicken 9.5 oz + rice 1.5 cup + broccoli 1 cup + garlic + paprika",
      "category": "dinner"
    },
    {
      "id": "friday-dinner",
      "name": "Herb Chicken Bowl",
      "calories": 1159,
      "protein": 132,
      "recipe": "Chicken 9.5 oz + rice 1.5 cup + mixed veggies 1 cup + Italian seasoning",
      "category": "dinner"
    },
    {
      "id": "saturday-dinner",
      "name": "Buffalo Chicken Bowl",
      "calories": 1159,
      "protein": 132,
      "recipe": "Chicken 9.5 oz + rice 1.5 cup + broccoli 1 cup + buffalo sauce",
      "category": "dinner"
    },
    {
      "id": "sunday-dinner",
      "name": "Salt & Pepper Beef Plate",
      "calories": 1159,
      "protein": 132,
      "recipe": "93% beef 7 oz + potatoes 300 g + vegetables 1 cup + salt + pepper",
      "category": "dinner"
    },
    {
      "id": "daily-shake",
      "name": "Protein Shake",
      "calories": 120,
      "protein": 25,
      "recipe": "1 scoop in water",
      "category": "shake"
    }
  ]
} as const;
