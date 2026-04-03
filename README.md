# RentFlow
RENTFLOW – MOBILE APP
DOCUMENTATION

1. Project Description
RentFlow is a mobile application developed as a university laboratory project, designed
to simplify the process of searching and reserving rental apartments directly from a
smartphone.
The application allows users to browse apartments, check real-time availability based
on selected dates, and make secure reservations. The system also integrates intelligent
recommendation features powered by Artificial Intelligence, helping users find the
most suitable apartments based on their preferences.
The backend infrastructure is powered by Supabase, which uses PostgreSQL for
secure and scalable data management.

2. Problem Statement
Users currently face several issues when searching for apartments:
No real-time availability information
Time wasted contacting unavailable listings
Lack of mobile-friendly platforms
No intelligent suggestions
Scattered and unorganized listings
RentFlow solves these problems by providing:
real-time availability checking
mobile-first experience
centralized apartment system
AI-based recommendations

3. Project Goal &amp; Definition of Done
(MVP)
Goal
To build a fully functional mobile application that allows users to search, filter, and
reserve apartments efficiently.
Definition of Done (MVP)
The application is complete when:
User can register and log in
User can browse apartments
User can filter apartments
User can select a date range
System checks availability in real-time
User can reserve apartments
User can view their reservations
AI suggests recommended apartments

4. Target Audience
Students
Individuals looking for rent
Families
Property renters and owners

5. Functional &amp; Non-Functional
Requirements
 Functional Requirements
Feature Description
Browse Apartments View list of apartments

Filter Apartments Filter by city, price, rooms
Check Availability Verify based on selected dates
Reservation Book apartments
Authentication Login/Register
User Dashboard View reservations
AI Recommendations Smart suggestions

 Non-Functional Requirements
Fast performance (&lt;2 sec response)
Mobile responsive UI
Secure authentication
Scalable system
Reliable error handling

6. Smart AI Recommendation
The application uses Artificial Intelligence to:
analyze user preferences
suggest best apartments
improve decision making

7. Core System Logic (Availability
Engine)
1. User selects apartment
2. Chooses dates
3. System checks database
4. If conflict → Not Available
5. Else → Available

8. Technology Stack

 Mobile App
React Native
Backend
Supabase (API + Database)
Database
PostgreSQL
Authentication
Supabase Auth

 Architecture
Mobile App → Supabase API → Database

9. API Endpoints
GET /apartments
POST /check-availability
POST /reservations
GET /reservations

10. Database Schema
Users
id
email
password
Apartments

id
title
city
price
rooms

Bookings
id
user_id
apartment_id
start_date
end_date

11. Project Structure
/mobile-app
/components
/screens
/navigation
/services
supabase.js

12. Implementation Methodology
 Team (3 Members)
 Member 1 – Mobile Developer
 UI screens
 Navigation
 User interaction
 Member 2 – Backend Developer
 Supabase setup
 API logic
 Reservation system
 Member 3 – AI &amp; Database

 Database design
 AI recommendation
 Query optimization

 Timeline
Week 1
 Setup React Native
 UI design
Week 2
 Authentication
Week 3
 Apartment listing
Week 4
 Availability logic
Week 5
 Reservation + AI
Week 6
 Testing &amp; presentation

13. Challenges &amp; Future Improvements
Challenges
 Availability logic
 Real-time updates
 AI accuracy

Future Improvements
 Push notifications
 Google Maps integration
 Online payments
 Reviews &amp; ratings

14. Conclusion
RentFlow is a modern mobile-first solution that simplifies apartment searching and
booking through automation, real-time availability, and intelligent recommendations.
