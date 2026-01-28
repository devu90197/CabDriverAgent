import { supabase } from './supabaseClient'

// Function to save route calculation to Supabase
export async function saveRouteCalculation(routeData: any) {
  try {
    const { data, error } = await supabase
      .from('route_calculations')
      .insert([
        {
          user_id: routeData.user_id || 'anonymous',
          pickup_location: routeData.pickup,
          dropoff_location: routeData.dropoff,
          stops: routeData.stops || [],
          route_result: routeData.result,
          algorithm_used: routeData.algorithm,
          distance_km: routeData.result?.distance_km,
          eta_min: routeData.result?.eta_min,
          created_at: new Date().toISOString()
        }
      ])
      
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving route calculation:', error)
    return null
  }
}

// Function to get route history for a user
export async function getRouteHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('route_calculations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching route history:', error)
    return []
  }
}

// Function to subscribe to real-time route updates
export function subscribeToRouteUpdates(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('route_calculations_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'route_calculations'
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()
    
  return subscription
}

// Function to save user preferences
export async function saveUserPreferences(userId: string, preferences: any) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: preferences,
        updated_at: new Date().toISOString()
      })
      
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving user preferences:', error)
    return null
  }
}

// Function to get user preferences
export async function getUserPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single()
      
    if (error) throw error
    return data?.preferences || {}
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return {}
  }
}