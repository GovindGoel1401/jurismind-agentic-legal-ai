Implement routing using React Router for the JurisMind AI frontend.

Routes should include:

/
 /about
 /contact
 /case-input
 /analysis/:caseId
 /debate/:caseId
 /verdict/:caseId
 /similar-cases/:caseId
 /lawyer-review/:caseId
 /feedback/:caseId

Each route should load its corresponding page component.

Use a shared MainLayout for most pages.

Landing page should use a separate layout.

Add basic navigation guards and placeholder state for future authentication.

Use lazy loading for page components.