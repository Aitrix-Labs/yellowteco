import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import YellowtecoPage from './components/YellowtecoPage'
import { findPage, pages } from './generated/pages'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function PageRoute() {
  const { pathname } = useLocation()
  const page = findPage(pathname)
  return <YellowtecoPage key={page.route} page={page} />
}

export default function App() {
  const known = pages.map((page) => page.route)

  return (
    <BrowserRouter basename="/yellowteco">
      <ScrollToTop />
      <Routes>
        {known.map((route) => (
          <Route key={route} path={route === '/' ? '/' : route} element={<PageRoute />} />
        ))}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
