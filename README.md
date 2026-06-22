async function uploadToBackend(file) {
    setError('')
    setLoading(true)
    setMetrics(null)
    setRows([])

    try {
        const savedUser = JSON.parse(
            localStorage.getItem('user') || '{}'
        )
        const username = savedUser.username
                      || 'unknown'

        // ── Step 1: Upload file ───────────────
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch(
            `${API}/data/upload?username=${username}`,
            {
                method : 'POST',
                headers: {
                    'Authorization':`Bearer ${token}`
                },
                body: formData,
            }
        )

        if (!uploadRes.ok) {
            const err = await uploadRes.json()
            throw new Error(
                err.detail || 'Upload failed'
            )
        }

        const uploadData = await uploadRes.json()
        console.log('[Dashboard] Upload done:',
            uploadData.rows, 'rows')

        setFileMeta({
            name: uploadData.filename,
            rows: uploadData.rows,
        })

        // ── Step 2: Set rows from upload! ─────
        // NO separate /data/rows call!
        if (uploadData.data &&
            uploadData.data.length > 0) {
            console.log('[Dashboard] Setting rows:',
                uploadData.data.length)
            setRows(uploadData.data)
        }

        // ── Step 3: Get metrics only ──────────
        const metricsRes = await fetch(
            `${API}/data/metrics`,
            {
                headers: {
                    'Authorization':`Bearer ${token}`
                }
            }
        )

        if (metricsRes.ok) {
            const metricsData =
                await metricsRes.json()
            console.log('[Dashboard] Metrics:',
                metricsData.csat_pct + '%')
            setMetrics(metricsData)
        }

        setLoading(false)
        setPage('charts')
        notify(
            `Imported ${uploadData.rows
            .toLocaleString()} rows`,
            C.green
        )

    } catch(err) {
        console.error('[Dashboard] Error:', err)
        setError(err.message)
        notify(err.message, C.red, '⚠')
        setLoading(false)
    }
}