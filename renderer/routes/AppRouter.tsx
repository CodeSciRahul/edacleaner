import { HashRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { routes } from '@/routes/index'

/** HashRouter is required for packaged Electron (file://); BrowserRouter blanks the window. */
export function AppRouter(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Routes>
    </HashRouter>
  )
}
