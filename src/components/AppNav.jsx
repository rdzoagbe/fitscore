import React from 'react'
import TopNav from './TopNav'
import MobileBottomNav from './MobileBottomNav'

// Renders both — CSS handles which is visible per breakpoint
export default function AppNav({ page, setPage, onLogoClick }) {
  return (
    <>
      <TopNav page={page} setPage={setPage} onLogoClick={onLogoClick} />
      <MobileBottomNav page={page} setPage={setPage} onLogoClick={onLogoClick} />
    </>
  )
}
