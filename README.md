import pandas as pd

print("Loading files...")

df1 = pd.read_csv("IMDB_18k.csv")
df2 = pd.read_csv("IMDB_18k_part2.csv")
df3 = pd.read_csv("IMDB_18k_part3.csv")

print(f"Part 1 : {len(df1)} rows")
print(f"Part 2 : {len(df2)} rows")
print(f"Part 3 : {len(df3)} rows")

# Merge all three
df_full = pd.concat([df1, df2, df3]).reset_index(drop=True)

# Shuffle
df_full = df_full.sample(frac=1, random_state=42).reset_index(drop=True)

# Save
df_full.to_csv("IMDB_full.csv", index=False)

print()
print(f"Merged total  : {len(df_full)} rows")
print(f"Positive      : {len(df_full[df_full['sentiment']=='positive'])}")
print(f"Negative      : {len(df_full[df_full['sentiment']=='negative'])}")
print()
print("Saved as IMDB_full.csv!")
