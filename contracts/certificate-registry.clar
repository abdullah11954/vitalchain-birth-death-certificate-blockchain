;; Certificate Registry Contract
;; Core contract for issuing and managing birth and death certificates

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_CERTIFICATE_NOT_FOUND (err u404))
(define-constant ERR_INVALID_CERTIFICATE_TYPE (err u400))
(define-constant ERR_CERTIFICATE_ALREADY_EXISTS (err u409))

;; Certificate types
(define-constant BIRTH_CERTIFICATE u1)
(define-constant DEATH_CERTIFICATE u2)

;; Data variables
(define-data-var certificate-counter uint u0)

;; Certificate data structure
(define-map certificates
  uint
  {
    certificate-type: uint,
    person-name: (string-ascii 100),
    person-id: (string-ascii 50),
    birth-date: uint,
    birth-place: (string-ascii 100),
    death-date: (optional uint),
    death-place: (optional (string-ascii 100)),
    parents-info: (string-ascii 200),
    issuer: principal,
    issue-date: uint,
    document-hash: (buff 32),
    status: uint,
    block-height: uint
  }
)

;; Certificate status mapping
(define-map certificate-status
  uint
  {
    active: bool,
    amended: bool,
    revoked: bool
  }
)

;; Person to certificates mapping
(define-map person-certificates
  (string-ascii 50)
  (list 10 uint)
)

;; Public functions

;; Issue a birth certificate
(define-public (issue-birth-certificate 
  (person-name (string-ascii 100))
  (person-id (string-ascii 50))
  (birth-date uint)
  (birth-place (string-ascii 100))
  (parents-info (string-ascii 200))
  (document-hash (buff 32)))
  (let ((certificate-id (+ (var-get certificate-counter) u1)))
    (begin
      ;; Check if certificate already exists for this person
      (asserts! (is-none (get-birth-certificate-by-person person-id)) ERR_CERTIFICATE_ALREADY_EXISTS)
      
      ;; Store certificate
      (map-set certificates certificate-id
        {
          certificate-type: BIRTH_CERTIFICATE,
          person-name: person-name,
          person-id: person-id,
          birth-date: birth-date,
          birth-place: birth-place,
          death-date: none,
          death-place: none,
          parents-info: parents-info,
          issuer: tx-sender,
          issue-date: stacks-block-height,
          document-hash: document-hash,
          status: u1,
          block-height: stacks-block-height
        })
      
      ;; Set certificate status
      (map-set certificate-status certificate-id
        {
          active: true,
          amended: false,
          revoked: false
        })
      
      ;; Add to person's certificate list
      (map-set person-certificates person-id 
        (unwrap! (as-max-len? (append (default-to (list) (map-get? person-certificates person-id)) certificate-id) u10) ERR_CERTIFICATE_ALREADY_EXISTS))
      
      ;; Update counter
      (var-set certificate-counter certificate-id)
      
      (ok certificate-id))))

;; Issue a death certificate
(define-public (issue-death-certificate
  (person-name (string-ascii 100))
  (person-id (string-ascii 50))
  (birth-date uint)
  (death-date uint)
  (death-place (string-ascii 100))
  (document-hash (buff 32)))
  (let ((certificate-id (+ (var-get certificate-counter) u1)))
    (begin
      ;; Store certificate
      (map-set certificates certificate-id
        {
          certificate-type: DEATH_CERTIFICATE,
          person-name: person-name,
          person-id: person-id,
          birth-date: birth-date,
          birth-place: "",
          death-date: (some death-date),
          death-place: (some death-place),
          parents-info: "",
          issuer: tx-sender,
          issue-date: stacks-block-height,
          document-hash: document-hash,
          status: u1,
          block-height: stacks-block-height
        })
      
      ;; Set certificate status
      (map-set certificate-status certificate-id
        {
          active: true,
          amended: false,
          revoked: false
        })
      
      ;; Add to person's certificate list
      (map-set person-certificates person-id 
        (unwrap! (as-max-len? (append (default-to (list) (map-get? person-certificates person-id)) certificate-id) u10) ERR_CERTIFICATE_ALREADY_EXISTS))
      
      ;; Update counter
      (var-set certificate-counter certificate-id)
      
      (ok certificate-id))))

;; Verify certificate authenticity
(define-public (verify-certificate (certificate-id uint) (expected-hash (buff 32)))
  (match (map-get? certificates certificate-id)
    certificate
      (let ((stored-hash (get document-hash certificate))
            (cert-status (default-to {active: false, amended: false, revoked: false} 
                         (map-get? certificate-status certificate-id))))
        (if (and (is-eq stored-hash expected-hash) (get active cert-status))
          (ok true)
          (ok false)))
    (err ERR_CERTIFICATE_NOT_FOUND)))

;; Read-only functions

;; Get certificate by ID
(define-read-only (get-certificate (certificate-id uint))
  (map-get? certificates certificate-id))

;; Get certificate status
(define-read-only (get-certificate-status (certificate-id uint))
  (map-get? certificate-status certificate-id))

;; Get certificates for a person
(define-read-only (get-certificates-by-person (person-id (string-ascii 50)))
  (map-get? person-certificates person-id))

;; Get birth certificate for a person
(define-read-only (get-birth-certificate-by-person (person-id (string-ascii 50)))
  (match (map-get? person-certificates person-id)
    cert-list
      (fold find-birth-certificate cert-list none)
    none))

;; Get death certificate for a person
(define-read-only (get-death-certificate-by-person (person-id (string-ascii 50)))
  (match (map-get? person-certificates person-id)
    cert-list
      (fold find-death-certificate cert-list none)
    none))

;; Get total number of certificates
(define-read-only (get-certificate-counter)
  (var-get certificate-counter))

;; Private functions

;; Helper function to find birth certificate
(define-private (find-birth-certificate (certificate-id uint) (current-result (optional uint)))
  (if (is-some current-result)
    current-result
    (match (map-get? certificates certificate-id)
      certificate
        (if (is-eq (get certificate-type certificate) BIRTH_CERTIFICATE)
          (some certificate-id)
          none)
      none)))

;; Helper function to find death certificate
(define-private (find-death-certificate (certificate-id uint) (current-result (optional uint)))
  (if (is-some current-result)
    current-result
    (match (map-get? certificates certificate-id)
      certificate
        (if (is-eq (get certificate-type certificate) DEATH_CERTIFICATE)
          (some certificate-id)
          none)
      none)))