features/ = logic + data + reusable components
Orders logic
Invoice APIs
Client data
Shared tables

views/ = UI composition per role
Owner dashboard uses:
orders
invoices
clients

Client dashboard uses:

their orders
their invoices
Same feature, different exposure

pages are in each roles following the naming convention of views/<role>/<page>/

components

Keep ONLY:
UI primitives
truly shared components

Everything else → move to:
features/.../components
or
views/.../components

Feature = dynamic component “what the system does”
View = isntance of dynamic component with appropriate use specific parameters “who is using it”