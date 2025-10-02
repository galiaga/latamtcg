'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function DebugAuth() {
  const [info, setInfo] = useState<any>(null)
  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser()
      const { data: sessionData } = await supabase.auth.getSession()
      setInfo({
        locationOrigin: location.origin,
        envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        envKeyLen: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
        session: !!sessionData.session,
      })
    }
    run()
  }, [])
  return <pre style={{padding:16, overflow:'auto'}}>{JSON.stringify(info, null, 2)}</pre>
}


