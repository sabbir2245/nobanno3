
Create a dynamic, highly reusable Product Reviews component using React, TypeScript, and Tailwind CSS. Avoid hardcoding the data; instead, design it to accept a structured data object via props. Use Lucide React for icons.


- ReviewSummary: averageRating (number), totalRatings (number), 
2. TOP SECTION: Ratings Summary Dashboard

- Left Column: Display the average rating dynamically (e.g., "4.2/5"), render a row of 5 stars calculated based on the rating (supporting partial/half-filled stars), and show the total ratings count underneath.
- Right Column: Map through the distribution array (from 5-stars down to 1-star). Dynamically calculate the percentage width for the progress bar based on the total ratings. Display the count on the far right.

3. MIDDLE SECTION: Controls Bar

- Left: Section title "Product Reviews".
- Right: Two interactive button/dropdown elements: "Sort" and "Filter". They should accept onClick or onChange handlers for "Relevance", "Most Recent", "All stars", etc.

4. BOTTOM SECTION: Review Feed List

- Map through an array of ReviewItem objects to render the individual review cards.
- Each card must dynamically display:
  - The user's specific star rating (1-5 gold stars).
  
  - The review date formatted cleanly on the far right.
  - The review text body (ensuring proper word-wrap and font support for international/UTF-8 text).
  - A horizontal gallery row that maps through the `images` array, rendering them as small, uniform, aspect-square thumbnails. these are images that the customer added 
  -
 

Styling details: Ensure the entire layout is responsive (stacks vertically on mobile, side-by-side dashboard on desktop). Use a  soft borders, standard amber/gold for active stars, and a modern minimalist design.
