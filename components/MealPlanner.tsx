"use client";

import { useMemo } from "react";
import { ClipboardList, Plus, RotateCcw, ShoppingBasket } from "lucide-react";
import { mealPlanSeed } from "@/data/mealPlan";
import { MealItem } from "@/lib/types";
import { useLocalStorageState } from "@/lib/storage";

function createDefaultMeals(): MealItem[] {
  return mealPlanSeed.starterMeals.map((meal) => ({ ...meal, checked: false, notes: "" }));
}

export function MealPlanner() {
  const { state: meals, setState: setMeals, hydrated } = useLocalStorageState<MealItem[]>(
    "fitness-dashboard-meals",
    createDefaultMeals()
  );

  const totalCalories = useMemo(
    () => meals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0),
    [meals]
  );
  const totalProtein = useMemo(
    () => meals.reduce((sum, meal) => sum + Number(meal.protein || 0), 0),
    [meals]
  );

  function updateMeal(id: string, field: keyof MealItem, value: string | number | boolean) {
    setMeals((current) =>
      current.map((meal) => (meal.id === id ? { ...meal, [field]: value } : meal))
    );
  }

  function addMeal() {
    const timestamp = Date.now().toString();
    setMeals((current) => [
      ...current,
      {
        id: `custom-${timestamp}`,
        name: "New Meal",
        calories: 0,
        protein: 0,
        recipe: "",
        category: "dinner",
        checked: false,
        notes: ""
      }
    ]);
  }

  function resetMeals() {
    setMeals(createDefaultMeals());
  }

  if (!hydrated) {
    return <div className="card">Loading meal planner…</div>;
  }

  return (
    <div className="split-layout">
      <div className="stack">
        <div className="grid grid-3">
          <section className="card">
            <div className="badge">Daily Target</div>
            <div className="kpi">{mealPlanSeed.controls.calorieFloor.toLocaleString()}</div>
            <div className="small">Current calorie floor from your spreadsheet.</div>
          </section>
          <section className="card">
            <div className="badge">Current Plan Calories</div>
            <div className="kpi">{totalCalories.toLocaleString()}</div>
            <div className="small">Editable total from your saved meal list.</div>
          </section>
          <section className="card">
            <div className="badge">Current Plan Protein</div>
            <div className="kpi">{totalProtein} g</div>
            <div className="small">Target from sheet starts around 214 g.</div>
          </section>
        </div>

        <section className="card">
          <div className="section-title">
            <h2>Editable Meal Library</h2>
            <div className="row">
              <button className="secondary" onClick={resetMeals}><RotateCcw size={16} /> Reset</button>
              <button onClick={addMeal}><Plus size={16} /> Add meal</button>
            </div>
          </div>

          <div className="stack">
            {meals.map((meal) => (
              <article key={meal.id} className="card" style={{ padding: 16, background: "rgba(15,23,42,0.55)" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="tag">{meal.category}</div>
                    <h3 style={{ margin: "8px 0 6px" }}>{meal.name}</h3>
                    <div className="small">{meal.calories} cal · {meal.protein} g protein</div>
                  </div>
                  <label className="checkbox-row" style={{ alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(meal.checked)}
                      onChange={(e) => updateMeal(meal.id, "checked", e.target.checked)}
                    />
                    <span className="small">Prepped / ready</span>
                  </label>
                </div>

                <div className="grid grid-3" style={{ marginTop: 12 }}>
                  <div>
                    <label className="small">Meal name</label>
                    <input value={meal.name} onChange={(e) => updateMeal(meal.id, "name", e.target.value)} />
                  </div>
                  <div>
                    <label className="small">Calories</label>
                    <input
                      type="number"
                      value={meal.calories}
                      onChange={(e) => updateMeal(meal.id, "calories", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="small">Protein (g)</label>
                    <input
                      type="number"
                      value={meal.protein}
                      onChange={(e) => updateMeal(meal.id, "protein", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className="small">Recipe / build</label>
                  <textarea
                    value={meal.recipe ?? ""}
                    onChange={(e) => updateMeal(meal.id, "recipe", e.target.value)}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label className="small">Notes</label>
                  <textarea
                    value={meal.notes ?? ""}
                    onChange={(e) => updateMeal(meal.id, "notes", e.target.value)}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="stack">
        <section className="card">
          <div className="section-title">
            <h2>Recipe Cards</h2>
            <span className="badge"><ClipboardList size={16} /> From spreadsheet</span>
          </div>
          <div className="stack">
            {mealPlanSeed.recipes.map((recipe) => (
              <article key={recipe.id} className="card" style={{ padding: 16, background: "rgba(15,23,42,0.55)" }}>
                <h3 style={{ marginBottom: 8 }}>{recipe.name}</h3>
                <div className="small" style={{ marginBottom: 8 }}><strong>Ingredients:</strong> {recipe.ingredients}</div>
                <div className="small"><strong>Steps:</strong> {recipe.steps}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Weekly Grocery Snapshot</h2>
            <span className="badge"><ShoppingBasket size={16} /> Auto Grocery</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {mealPlanSeed.grocery.map(([item, amount, notes]) => (
                  <tr key={item}>
                    <td>{item}</td>
                    <td>{amount}</td>
                    <td>{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
