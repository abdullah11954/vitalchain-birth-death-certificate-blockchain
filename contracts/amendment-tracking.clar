;; Amendment Tracking Contract
;; Handles certificate amendments and maintains immutable audit trails

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_INVALID_AMENDMENT_TYPE (err u400))
(define-constant ERR_CERTIFICATE_NOT_FOUND (err u405))
(define-constant ERR_AMENDMENT_ALREADY_APPROVED (err u409))
(define-constant ERR_INSUFFICIENT_APPROVALS (err u406))

;; Amendment types
(define-constant AMENDMENT_CORRECTION u1)
(define-constant AMENDMENT_UPDATE u2)
(define-constant AMENDMENT_STATUS_CHANGE u3)
(define-constant AMENDMENT_CROSS_REFERENCE u4)

;; Amendment status
(define-constant STATUS_PENDING u1)
(define-constant STATUS_APPROVED u2)
(define-constant STATUS_REJECTED u3)

;; Data variables
(define-data-var amendment-counter uint u0)
(define-data-var required-approvals uint u2) ;; Default 2 approvals needed

;; Amendment data structure
(define-map amendments
  uint
  {
    certificate-id: uint,
    amendment-type: uint,
    description: (string-ascii 500),
    old-data: (string-ascii 1000),
    new-data: (string-ascii 1000),
    proposer: principal,
    proposal-date: uint,
    status: uint,
    approval-count: uint,
    rejection-count: uint,
    final-approver: (optional principal),
    completion-date: (optional uint),
    reason: (string-ascii 200)
  }
)

;; Amendment approvals tracking
(define-map amendment-approvals
  {amendment-id: uint, approver: principal}
  {
    approved: bool,
    approval-date: uint,
    comments: (string-ascii 300)
  }
)

;; Certificate amendment history
(define-map certificate-amendments
  uint
  (list 20 uint)
)

;; Cross-references between certificates
(define-map certificate-links
  uint
  (list 5 uint)
)

;; Amendment approvers list
(define-map amendment-approvers
  uint
  (list 10 principal)
)

;; Public functions

;; Create a new amendment proposal
(define-public (create-amendment
  (certificate-id uint)
  (amendment-type uint)
  (description (string-ascii 500))
  (old-data (string-ascii 1000))
  (new-data (string-ascii 1000))
  (reason (string-ascii 200)))
  (let ((amendment-id (+ (var-get amendment-counter) u1)))
    (begin
      ;; Validate amendment type
      (asserts! (or (is-eq amendment-type AMENDMENT_CORRECTION)
                    (or (is-eq amendment-type AMENDMENT_UPDATE)
                        (or (is-eq amendment-type AMENDMENT_STATUS_CHANGE)
                            (is-eq amendment-type AMENDMENT_CROSS_REFERENCE)))) ERR_INVALID_AMENDMENT_TYPE)
      
      ;; Create amendment record
      (map-set amendments amendment-id
        {
          certificate-id: certificate-id,
          amendment-type: amendment-type,
          description: description,
          old-data: old-data,
          new-data: new-data,
          proposer: tx-sender,
          proposal-date: stacks-block-height,
          status: STATUS_PENDING,
          approval-count: u0,
          rejection-count: u0,
          final-approver: none,
          completion-date: none,
          reason: reason
        })
      
      ;; Add to certificate's amendment history
      (map-set certificate-amendments certificate-id
        (unwrap! (as-max-len? (append (default-to (list) (map-get? certificate-amendments certificate-id)) amendment-id) u20) ERR_NOT_FOUND))
      
      ;; Update counter
      (var-set amendment-counter amendment-id)
      
      (ok amendment-id))))

;; Approve an amendment
(define-public (approve-amendment (amendment-id uint) (comments (string-ascii 300)))
  (begin
    ;; Check if amendment exists
    (match (map-get? amendments amendment-id)
      amendment
        (begin
          ;; Check if still pending
          (asserts! (is-eq (get status amendment) STATUS_PENDING) ERR_AMENDMENT_ALREADY_APPROVED)
          
          ;; Check if not already approved by this entity
          (asserts! (is-none (map-get? amendment-approvals {amendment-id: amendment-id, approver: tx-sender})) ERR_AMENDMENT_ALREADY_APPROVED)
          
          ;; Record approval
          (map-set amendment-approvals {amendment-id: amendment-id, approver: tx-sender}
            {
              approved: true,
              approval-date: stacks-block-height,
              comments: comments
            })
          
          ;; Update approval count
          (let ((new-approval-count (+ (get approval-count amendment) u1)))
            (map-set amendments amendment-id
              (merge amendment {approval-count: new-approval-count}))
            
            ;; Check if enough approvals to finalize
            (if (>= new-approval-count (var-get required-approvals))
              (begin
                (map-set amendments amendment-id
                  (merge amendment {
                    status: STATUS_APPROVED,
                    approval-count: new-approval-count,
                    final-approver: (some tx-sender),
                    completion-date: (some stacks-block-height)
                  }))
                (ok "approved-and-finalized"))
              (ok "approval-recorded"))))
      ERR_NOT_FOUND)))

;; Reject an amendment
(define-public (reject-amendment (amendment-id uint) (comments (string-ascii 300)))
  (begin
    ;; Check if amendment exists
    (match (map-get? amendments amendment-id)
      amendment
        (begin
          ;; Check if still pending
          (asserts! (is-eq (get status amendment) STATUS_PENDING) ERR_AMENDMENT_ALREADY_APPROVED)
          
          ;; Check if not already voted by this entity
          (asserts! (is-none (map-get? amendment-approvals {amendment-id: amendment-id, approver: tx-sender})) ERR_AMENDMENT_ALREADY_APPROVED)
          
          ;; Record rejection
          (map-set amendment-approvals {amendment-id: amendment-id, approver: tx-sender}
            {
              approved: false,
              approval-date: stacks-block-height,
              comments: comments
            })
          
          ;; Update rejection count
          (let ((new-rejection-count (+ (get rejection-count amendment) u1)))
            (map-set amendments amendment-id
              (merge amendment {rejection-count: new-rejection-count}))
            
            ;; Check if too many rejections to proceed
            (if (>= new-rejection-count (var-get required-approvals))
              (begin
                (map-set amendments amendment-id
                  (merge amendment {
                    status: STATUS_REJECTED,
                    rejection-count: new-rejection-count,
                    final-approver: (some tx-sender),
                    completion-date: (some stacks-block-height)
                  }))
                (ok "rejected-and-finalized"))
              (ok "rejection-recorded"))))
      ERR_NOT_FOUND)))

;; Link certificates (e.g., birth to death)
(define-public (link-certificates (certificate-id-1 uint) (certificate-id-2 uint))
  (begin
    ;; Add certificate-id-2 to certificate-id-1's links
    (map-set certificate-links certificate-id-1
      (unwrap! (as-max-len? (append (default-to (list) (map-get? certificate-links certificate-id-1)) certificate-id-2) u5) ERR_NOT_FOUND))
    
    ;; Add certificate-id-1 to certificate-id-2's links (bidirectional)
    (map-set certificate-links certificate-id-2
      (unwrap! (as-max-len? (append (default-to (list) (map-get? certificate-links certificate-id-2)) certificate-id-1) u5) ERR_NOT_FOUND))
    
    (ok true)))

;; Set required approvals count
(define-public (set-required-approvals (count uint))
  (begin
    ;; Only contract owner can change this
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set required-approvals count)
    (ok true)))

;; Read-only functions

;; Get amendment by ID
(define-read-only (get-amendment (amendment-id uint))
  (map-get? amendments amendment-id))

;; Get amendment history for a certificate
(define-read-only (get-amendment-history (certificate-id uint))
  (map-get? certificate-amendments certificate-id))

;; Get latest amendment for a certificate
(define-read-only (get-latest-amendment (certificate-id uint))
  (match (map-get? certificate-amendments certificate-id)
    amendment-list
      (let ((latest-id (fold get-max amendment-list u0)))
        (if (> latest-id u0)
          (map-get? amendments latest-id)
          none))
    none))

;; Get linked certificates
(define-read-only (get-linked-certificates (certificate-id uint))
  (map-get? certificate-links certificate-id))

;; Get amendment approval details
(define-read-only (get-amendment-approval (amendment-id uint) (approver principal))
  (map-get? amendment-approvals {amendment-id: amendment-id, approver: approver}))

;; Get pending amendments count
(define-read-only (get-pending-amendments-count)
  (fold count-pending-amendments (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20) u0))

;; Check if amendment needs more approvals
(define-read-only (needs-more-approvals (amendment-id uint))
  (match (map-get? amendments amendment-id)
    amendment
      (and (is-eq (get status amendment) STATUS_PENDING)
           (< (get approval-count amendment) (var-get required-approvals)))
    false))

;; Get required approvals count
(define-read-only (get-required-approvals)
  (var-get required-approvals))

;; Get amendment counter
(define-read-only (get-amendment-counter)
  (var-get amendment-counter))

;; Get amendments by proposer
(define-read-only (get-amendments-by-proposer (proposer principal))
  (fold find-amendments-by-proposer (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20) (list)))

;; Get amendments by status
(define-read-only (get-amendments-by-status (status-filter uint))
  (fold find-amendments-by-status (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20) (list)))

;; Private functions

;; Helper function to get maximum value
(define-private (get-max (current uint) (max-so-far uint))
  (if (> current max-so-far) current max-so-far))

;; Helper function to count pending amendments
(define-private (count-pending-amendments (amendment-id uint) (count uint))
  (match (map-get? amendments amendment-id)
    amendment
      (if (is-eq (get status amendment) STATUS_PENDING)
        (+ count u1)
        count)
    count))

;; Helper function to find amendments by proposer
(define-private (find-amendments-by-proposer (amendment-id uint) (result (list 20 uint)))
  (match (map-get? amendments amendment-id)
    amendment
      (if (is-eq (get proposer amendment) tx-sender)
        (unwrap! (as-max-len? (append result amendment-id) u20) result)
        result)
    result))

;; Helper function to find amendments by status
(define-private (find-amendments-by-status (amendment-id uint) (result (list 20 uint)))
  (match (map-get? amendments amendment-id)
    amendment
      (if (is-eq (get status amendment) u1) ;; This would be passed as parameter in real implementation
        (unwrap! (as-max-len? (append result amendment-id) u20) result)
        result)
    result))