;; Access Control Contract
;; Manages authorized entities and role-based permissions for VitalChain

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_ALREADY_EXISTS (err u409))
(define-constant ERR_INVALID_ROLE (err u400))
(define-constant ERR_CANNOT_REMOVE_SELF (err u403))

;; Role constants
(define-constant ROLE_ADMIN u1)
(define-constant ROLE_ISSUER u2)
(define-constant ROLE_VERIFIER u3)
(define-constant ROLE_AUDITOR u4)

;; Data variables
(define-data-var admin-count uint u1) ;; Start with 1 (contract owner)

;; Entity roles mapping
(define-map entity-roles
  principal
  {
    role: uint,
    active: bool,
    authorized-by: principal,
    authorization-date: uint,
    organization-name: (string-ascii 100),
    contact-info: (string-ascii 200)
  }
)

;; Role permissions mapping
(define-map role-permissions
  uint
  {
    can-issue-certificates: bool,
    can-verify-certificates: bool,
    can-manage-entities: bool,
    can-view-audit-trail: bool,
    can-approve-amendments: bool
  }
)

;; Organization entities list
(define-map organization-entities
  (string-ascii 100)
  (list 50 principal)
)

;; Initialize contract with owner as admin and set role permissions
(map-set entity-roles CONTRACT_OWNER
  {
    role: ROLE_ADMIN,
    active: true,
    authorized-by: CONTRACT_OWNER,
    authorization-date: stacks-block-height,
    organization-name: "System Administrator",
    contact-info: "system@vitalchain.org"
  })

;; Set role permissions during initialization
(map-set role-permissions ROLE_ADMIN
  {
    can-issue-certificates: true,
    can-verify-certificates: true,
    can-manage-entities: true,
    can-view-audit-trail: true,
    can-approve-amendments: true
  })

(map-set role-permissions ROLE_ISSUER
  {
    can-issue-certificates: true,
    can-verify-certificates: true,
    can-manage-entities: false,
    can-view-audit-trail: false,
    can-approve-amendments: false
  })

(map-set role-permissions ROLE_VERIFIER
  {
    can-issue-certificates: false,
    can-verify-certificates: true,
    can-manage-entities: false,
    can-view-audit-trail: false,
    can-approve-amendments: false
  })

(map-set role-permissions ROLE_AUDITOR
  {
    can-issue-certificates: false,
    can-verify-certificates: true,
    can-manage-entities: false,
    can-view-audit-trail: true,
    can-approve-amendments: false
  })

;; Public functions

;; Add authorized issuer (hospitals, government offices)
(define-public (add-authorized-issuer 
  (entity principal)
  (organization-name (string-ascii 100))
  (contact-info (string-ascii 200)))
  (begin
    ;; Check if caller has admin privileges
    (asserts! (is-admin tx-sender) ERR_UNAUTHORIZED)
    
    ;; Check if entity already exists
    (asserts! (is-none (map-get? entity-roles entity)) ERR_ALREADY_EXISTS)
    
    ;; Add entity with issuer role
    (map-set entity-roles entity
      {
        role: ROLE_ISSUER,
        active: true,
        authorized-by: tx-sender,
        authorization-date: stacks-block-height,
        organization-name: organization-name,
        contact-info: contact-info
      })
    
    ;; Add to organization list
    (map-set organization-entities organization-name
      (unwrap! (as-max-len? (append (default-to (list) (map-get? organization-entities organization-name)) entity) u50) ERR_ALREADY_EXISTS))
    
    (ok true)))

;; Add verifier entity
(define-public (add-verifier
  (entity principal)
  (organization-name (string-ascii 100))
  (contact-info (string-ascii 200)))
  (begin
    ;; Check if caller has admin privileges
    (asserts! (is-admin tx-sender) ERR_UNAUTHORIZED)
    
    ;; Check if entity already exists
    (asserts! (is-none (map-get? entity-roles entity)) ERR_ALREADY_EXISTS)
    
    ;; Add entity with verifier role
    (map-set entity-roles entity
      {
        role: ROLE_VERIFIER,
        active: true,
        authorized-by: tx-sender,
        authorization-date: stacks-block-height,
        organization-name: organization-name,
        contact-info: contact-info
      })
    
    ;; Add to organization list
    (map-set organization-entities organization-name
      (unwrap! (as-max-len? (append (default-to (list) (map-get? organization-entities organization-name)) entity) u50) ERR_ALREADY_EXISTS))
    
    (ok true)))

;; Add auditor entity
(define-public (add-auditor
  (entity principal)
  (organization-name (string-ascii 100))
  (contact-info (string-ascii 200)))
  (begin
    ;; Check if caller has admin privileges
    (asserts! (is-admin tx-sender) ERR_UNAUTHORIZED)
    
    ;; Check if entity already exists
    (asserts! (is-none (map-get? entity-roles entity)) ERR_ALREADY_EXISTS)
    
    ;; Add entity with auditor role
    (map-set entity-roles entity
      {
        role: ROLE_AUDITOR,
        active: true,
        authorized-by: tx-sender,
        authorization-date: stacks-block-height,
        organization-name: organization-name,
        contact-info: contact-info
      })
    
    ;; Add to organization list
    (map-set organization-entities organization-name
      (unwrap! (as-max-len? (append (default-to (list) (map-get? organization-entities organization-name)) entity) u50) ERR_ALREADY_EXISTS))
    
    (ok true)))

;; Promote entity to admin
(define-public (add-admin
  (entity principal)
  (organization-name (string-ascii 100))
  (contact-info (string-ascii 200)))
  (begin
    ;; Check if caller has admin privileges
    (asserts! (is-admin tx-sender) ERR_UNAUTHORIZED)
    
    ;; Check if entity already exists
    (asserts! (is-none (map-get? entity-roles entity)) ERR_ALREADY_EXISTS)
    
    ;; Add entity with admin role
    (map-set entity-roles entity
      {
        role: ROLE_ADMIN,
        active: true,
        authorized-by: tx-sender,
        authorization-date: stacks-block-height,
        organization-name: organization-name,
        contact-info: contact-info
      })
    
    ;; Add to organization list
    (map-set organization-entities organization-name
      (unwrap! (as-max-len? (append (default-to (list) (map-get? organization-entities organization-name)) entity) u50) ERR_ALREADY_EXISTS))
    
    ;; Increment admin count
    (var-set admin-count (+ (var-get admin-count) u1))
    
    (ok true)))

;; Revoke entity access
(define-public (revoke-access (entity principal))
  (begin
    ;; Check if caller has admin privileges
    (asserts! (is-admin tx-sender) ERR_UNAUTHORIZED)
    
    ;; Cannot remove self if you're the only admin
    (asserts! (not (and (is-eq entity tx-sender) (is-eq (var-get admin-count) u1))) ERR_CANNOT_REMOVE_SELF)
    
    ;; Check if entity exists
    (match (map-get? entity-roles entity)
      entity-info
        (begin
          ;; Deactivate the entity
          (map-set entity-roles entity
            (merge entity-info {active: false}))
          
          ;; If removing an admin, decrease count
          (if (is-eq (get role entity-info) ROLE_ADMIN)
            (var-set admin-count (- (var-get admin-count) u1))
            true)
          
          (ok true))
      ERR_NOT_FOUND)))

;; Update entity role
(define-public (update-entity-role (entity principal) (new-role uint))
  (begin
    ;; Check if caller has admin privileges
    (asserts! (is-admin tx-sender) ERR_UNAUTHORIZED)
    
    ;; Validate role
    (asserts! (or (is-eq new-role ROLE_ADMIN) 
                  (or (is-eq new-role ROLE_ISSUER) 
                      (or (is-eq new-role ROLE_VERIFIER) 
                          (is-eq new-role ROLE_AUDITOR)))) ERR_INVALID_ROLE)
    
    ;; Check if entity exists
    (match (map-get? entity-roles entity)
      entity-info
        (let ((old-role (get role entity-info)))
          (begin
            ;; Update the role
            (map-set entity-roles entity
              (merge entity-info {role: new-role}))
            
            ;; Update admin count if necessary
            (if (and (is-eq old-role ROLE_ADMIN) (not (is-eq new-role ROLE_ADMIN)))
              (var-set admin-count (- (var-get admin-count) u1))
              (if (and (not (is-eq old-role ROLE_ADMIN)) (is-eq new-role ROLE_ADMIN))
                (var-set admin-count (+ (var-get admin-count) u1))
                true))
            
            (ok true)))
      ERR_NOT_FOUND)))

;; Read-only functions

;; Check if entity has specific permission
(define-read-only (has-permission (entity principal) (permission (string-ascii 50)))
  (match (map-get? entity-roles entity)
    entity-info
      (if (get active entity-info)
        (match (map-get? role-permissions (get role entity-info))
          permissions
            (if (is-eq permission "issue-certificates")
              (get can-issue-certificates permissions)
              (if (is-eq permission "verify-certificates")
                (get can-verify-certificates permissions)
                (if (is-eq permission "manage-entities")
                  (get can-manage-entities permissions)
                  (if (is-eq permission "view-audit-trail")
                    (get can-view-audit-trail permissions)
                    (if (is-eq permission "approve-amendments")
                      (get can-approve-amendments permissions)
                      false)))))
          false)
        false)
    false))

;; Check if entity can issue certificates
(define-read-only (can-issue-certificates (entity principal))
  (has-permission entity "issue-certificates"))

;; Check if entity can verify certificates
(define-read-only (can-verify-certificates (entity principal))
  (has-permission entity "verify-certificates"))

;; Check if entity can manage other entities
(define-read-only (can-manage-entities (entity principal))
  (has-permission entity "manage-entities"))

;; Check if entity is admin
(define-read-only (is-admin (entity principal))
  (match (map-get? entity-roles entity)
    entity-info
      (and (get active entity-info) (is-eq (get role entity-info) ROLE_ADMIN))
    false))

;; Check if entity is issuer
(define-read-only (is-issuer (entity principal))
  (match (map-get? entity-roles entity)
    entity-info
      (and (get active entity-info) (is-eq (get role entity-info) ROLE_ISSUER))
    false))

;; Check if entity is verifier
(define-read-only (is-verifier (entity principal))
  (match (map-get? entity-roles entity)
    entity-info
      (and (get active entity-info) (is-eq (get role entity-info) ROLE_VERIFIER))
    false))

;; Get entity information
(define-read-only (get-entity-info (entity principal))
  (map-get? entity-roles entity))

;; Get entities by organization
(define-read-only (get-organization-entities (organization-name (string-ascii 100)))
  (map-get? organization-entities organization-name))

;; Get role permissions
(define-read-only (get-role-permissions (role uint))
  (map-get? role-permissions role))

;; Get admin count
(define-read-only (get-admin-count)
  (var-get admin-count))