// Import Routes
import { Route as rootRoute } from './routes/__root'
import { Route as AboutRoute } from './routes/about'
import { Route as IndexRoute } from './routes/index'

// Create and export the route tree
export const routeTree = rootRoute.addChildren([IndexRoute, AboutRoute]) 