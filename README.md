Generate a CSV dataset for an IT Services company 
external client project feedback system with 
20000 rows and these exact columns:

Feedback_ID, Client_ID, Client_Name, Client_Email,
Client_Company, Industry, Location, Project_ID,
Priority, Project_Type, Assigned_Agent, Agent_Email,
State, Date_Created, Date_Resolved, Quarter,
Response_Time_Minutes, Resolution_Time_Hours,
Response_SLA_Target_Min, Resolution_SLA_Target_Hrs,
Response_SLA_Breached, Resolution_SLA_Breached,
SLA_Breached, Client_Feedback, Star_Rating,
Predicted_Sentiment, CSAT, DSAT, NPS_Score,
NPS_Category

Rules:
- Client_ID is primary key (format EXT20000)
- Client_Email format: firstname.lastname@clientcompany.com
- Priority P1 P2 P3 with SLA targets:
  P1 response 15 min resolution 4 hours
  P2 response 30 min resolution 8 hours
  P3 response 240 min resolution 24 hours
- SLA_Breached Yes if actual time exceeds target
- Client_Feedback is real detailed text review
- Predicted_Sentiment is Positive Negative or Neutral
- CSAT = 1 if Positive else 0 (binary only)
- DSAT = 1 if Negative else 0 (binary only)
- Positive feedback CSAT=1 DSAT=0
- Negative feedback CSAT=0 DSAT=1
- Neutral feedback CSAT=0 DSAT=0
- 85% Positive 10% Negative 5% Neutral
- Star Rating 4-5 for Positive 1-2 for Negative 3 for Neutral
- Client companies: Alpha Bank Metro Bank Apollo Hospitals
  Fortis Healthcare Reliance Retail Tata Motors TeleConnect
  GlobalPhone ShopEasy PowerGen NationalAir
- Industries: Banking Healthcare Retail Manufacturing Telecom
  Energy Aviation Fintech
- Project types: Cloud Migration Digital Transformation
  ERP Implementation Cybersecurity Solutions
  Data Analytics Platform AI/ML Implementation
  Network Infrastructure Application Development
- NPS_Category Promoter if NPS 9-10 Passive if 7-8 Detractor if 0-6
