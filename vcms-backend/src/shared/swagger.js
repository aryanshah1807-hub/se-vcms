export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Veterinary Clinic Management System (VCMS) API",
    version: "1.0.0",
    description: "RESTful API for Pet/Owner Registration (Module 1) and Appointment Scheduling (Module 2) per SRS Release 1.0."
  },
  servers: [
    { url: "http://localhost:4000/api", description: "Local development server" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Authenticate staff or client",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          200: { description: "JWT access token returned" },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/clients": {
      get: {
        summary: "List all active clients (Staff only)",
        responses: { 200: { description: "List of active clients" } }
      },
      post: {
        summary: "Register a new client and pet",
        responses: {
          201: { description: "Client and pet created" },
          409: { description: "Duplicate phone or email warning (REG-3)" }
        }
      }
    },
    "/clients/merge": {
      post: {
        summary: "Merge duplicate clients (REG-4)",
        responses: { 200: { description: "Clients merged" } }
      }
    },
    "/patients": {
      get: {
        summary: "List patients (Staff: all, Owner: own pets only)",
        responses: { 200: { description: "List of patients" } }
      }
    },
    "/vets": {
      get: {
        summary: "List veterinarians and their working hours (STAFF-4)",
        responses: { 200: { description: "List of active vets" } }
      }
    },
    "/vets/{id}/slots": {
      get: {
        summary: "Available time slots for vet on date (APT-3)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } }
        ],
        responses: { 200: { description: "Available time slots" } }
      }
    },
    "/appointments": {
      get: {
        summary: "Get appointments calendar",
        responses: { 200: { description: "List of appointments" } }
      },
      post: {
        summary: "Book (staff) or request (owner) an appointment (APT-1, APT-2)",
        responses: { 201: { description: "Appointment created" } }
      }
    },
    "/appointments/{id}/status": {
      patch: {
        summary: "Change appointment status (Check-in, start, complete, cancel)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Status updated" } }
      }
    },
    "/appointments/{id}/reschedule": {
      patch: {
        summary: "Reschedule a scheduled appointment (APT-5)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Appointment rescheduled" } }
      }
    },
    "/notifications": {
      get: {
        summary: "View notification log (CI-1, CI-2)",
        responses: { 200: { description: "List of notifications" } }
      }
    },
    "/audit": {
      get: {
        summary: "View activity audit trail (REG-7)",
        responses: { 200: { description: "Chronological audit records" } }
      }
    }
  }
};
