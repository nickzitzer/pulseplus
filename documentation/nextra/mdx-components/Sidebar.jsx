import React from 'react'
import { useRouter } from 'next/router'

export function Sidebar({ items }) {
  const router = useRouter()
  
  // Function to render menu items
  const renderItems = (items) => {
    return Object.entries(items).map(([key, item]) => {
      // Skip separators and hidden items
      if (item.type === 'separator' || item.display === 'hidden') {
        return null
      }
      
      // Get the title from the item - fixed to properly access the title
      const title = typeof item === 'object' && item.title ? item.title : key
      
      // Check if this is the active item
      const isActive = router.asPath === `/${key}`
      
      // Render menu items
      if (item.type === 'menu' && item.items) {
        return (
          <div key={key} className="nextra-sidebar-menu">
            <div className="nextra-sidebar-menu-title">{title}</div>
            <div className="nextra-sidebar-menu-items">
              {renderItems(item.items)}
            </div>
          </div>
        )
      }
      
      // Render regular page links
      return (
        <a 
          key={key}
          href={`/${key}`}
          className={`nextra-sidebar-item ${isActive ? 'active' : ''}`}
        >
          {title}
        </a>
      )
    })
  }
  
  return (
    <div className="nextra-sidebar">
      {renderItems(items)}
    </div>
  )
} 