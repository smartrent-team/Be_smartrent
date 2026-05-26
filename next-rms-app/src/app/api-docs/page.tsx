'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <SwaggerUI
        url="/swagger.json"
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        tryItOutEnabled={true}
        requestInterceptor={(req) => {
          // Tự động đọc token từ localStorage (nếu có) để điền vào request thử nghiệm
          if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token')
            if (token && !req.headers['Authorization']) {
              req.headers['Authorization'] = `Bearer ${token}`
            }
          }
          return req
        }}
      />
    </div>
  )
}
