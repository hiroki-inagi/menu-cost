export const recipeApi = {
  updateIngredient: (id: string, riId: string, data: Partial<{ ingredient_id: string; quantity: number; yield_rate: number }>) =>
    console.log(id, riId, data),
}
