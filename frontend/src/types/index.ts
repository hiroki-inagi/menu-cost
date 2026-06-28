export interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'staff'
  store_id: string | null
}

export interface Store {
  id: string
  name: string
  default_cost_rate: number
  tax_rate: number
  rounding_unit: number
  labor_cost_rate: number | null
  city_name: string | null
  latitude: number | null
  longitude: number | null
}

export interface Supplier {
  id: string
  name: string
  contact: string | null
  note: string | null
  created_at: string
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  unit_price: number
  category: string | null
  supplier_id: string | null
  note: string | null
  created_at: string
  updated_at: string | null
  recipe_count: number
}

export interface PriceHistory {
  id: string
  unit_price: number
  recorded_at: string
}

export interface RecipeIngredient {
  id: string
  ingredient_id: string
  ingredient_name: string
  unit: string
  unit_price: number
  quantity: number
  yield_rate: number
  cost: number
}

export interface CostCalculation {
  total_cost: number
  cost_per_serving: number
  effective_cost_rate: number | null
  recommended_price_ex_tax: number | null
  recommended_price_in_tax: number | null
  target_cost_rate: number
  status: 'good' | 'warning' | 'danger'
}

export interface Recipe {
  id: string
  name: string
  category: string | null
  target_cost_rate: number | null
  selling_price: number | null
  servings: number
  image_url: string | null
  note: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
  recipe_ingredients: RecipeIngredient[]
  calculation: CostCalculation | null
}

export interface DailySales {
  id: string
  recipe_id: string
  recipe_name: string
  sold_date: string
  quantity: number
  revenue: number
  day_of_week: number
}

export interface RankingItem {
  recipe_id: string
  recipe_name: string
  category: string | null
  total_quantity: number
  total_revenue: number
}

export interface WeekdayHeatmapItem {
  recipe_id: string
  recipe_name: string
  day_of_week: number
  total_quantity: number
  total_revenue: number
}

export interface WeatherSalesItem {
  condition: string
  condition_label: string
  recipe_name: string
  recipe_id: string
  avg_quantity: number
  total_days: number
}

export interface TodayRecommend {
  recipe_id: string
  recipe_name: string
  category: string | null
  avg_quantity: number
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface TodayWeather {
  date: string
  condition: string
  condition_label: string
  temp_max: number
  temp_min: number
  precipitation: number
  city: string | null
}
