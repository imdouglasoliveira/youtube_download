import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'

const rootRoute = createRootRoute({
  component: () => <Layout><HomePage /></Layout>
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })