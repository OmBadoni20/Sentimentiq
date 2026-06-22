def process_upload(contents: bytes,
                   filename: str,
                   uploaded_by: str = 'unknown'):
    global current_df, current_upload

    name = filename.lower()

    if name.endswith('.csv'):
        current_df = pd.read_csv(
            io.BytesIO(contents))
    elif name.endswith(('.xlsx', '.xls')):
        current_df = pd.read_excel(
            io.BytesIO(contents))
    elif name.endswith('.json'):
        current_df = pd.read_json(
            io.BytesIO(contents))
    else:
        raise ValueError(
            f"Unsupported: {filename}")

    current_df = current_df.fillna('')

    # Generate upload ID
    upload_id = f"upload_{uuid.uuid4().hex[:8]}"

    # Convert to string for DB storage
    str_df = current_df.copy()
    for col in str_df.columns:
        str_df[col] = str_df[col].astype(str)

    rows_for_db = str_df.to_dict(
        orient='records')

    # Save to SQLite
    save_upload(
        rows        = rows_for_db,
        filename    = filename,
        uploaded_by = uploaded_by,
        upload_id   = upload_id,
    )

    current_upload = {
        'upload_id'  : upload_id,
        'filename'   : filename,
        'uploaded_by': uploaded_by,
        'rows'       : len(rows_for_db),
    }

    print(f"[DataService] {len(rows_for_db)} "
          f"rows saved to sentimentiq.db!")

    # Convert rows for frontend safely
    rows_for_frontend = []
    for row in rows_for_db:
        clean = {}
        for k, v in row.items():
            try:
                # Make sure value is basic type
                if v is None or v == 'nan' \
                   or v == 'None':
                    clean[str(k)] = ''
                else:
                    clean[str(k)] = str(v)
            except:
                clean[str(k)] = ''
        rows_for_frontend.append(clean)

    return {
        "message"  : f"Uploaded {len(rows_for_db)} rows",
        "rows"     : len(rows_for_db),
        "columns"  : list(current_df.columns),
        "filename" : filename,
        "upload_id": upload_id,
        # Return ALL rows directly!
        "data"     : rows_for_frontend,
    }