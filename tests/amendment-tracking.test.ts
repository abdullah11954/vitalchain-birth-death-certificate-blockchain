import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

describe('Amendment Tracking Contract', () => {
  it('should deploy successfully', () => {
    expect(simnet).toBeDefined();
    
    // Check required approvals default value
    const requiredApprovals = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-required-approvals',
      [],
      simnet.deployer
    );
    
    expect(requiredApprovals.result).toBeUint(2);
  });

  it('should create amendment proposal successfully', () => {
    const result = simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1), // certificate-id
        Cl.uint(1), // AMENDMENT_CORRECTION
        Cl.stringAscii('Correcting spelling error in name'),
        Cl.stringAscii('John Smyth'),
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('Spelling mistake in original certificate')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.uint(1));
    
    // Verify amendment was created
    const amendment = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-amendment',
      [Cl.uint(1)],
      simnet.deployer
    );
    
    expect(amendment.result).toBeSome();
    
    // Check amendment counter
    const counter = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-amendment-counter',
      [],
      simnet.deployer
    );
    
    expect(counter.result).toBeUint(1);
  });

  it('should allow approving amendments', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(1), // AMENDMENT_CORRECTION
        Cl.stringAscii('Correcting spelling error'),
        Cl.stringAscii('John Smyth'),
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('Spelling mistake')
      ],
      simnet.deployer
    );
    
    // Approve amendment
    const approveResult = simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('Looks good, approved')
      ],
      wallet1
    );
    
    expect(approveResult.result).toBeOk(Cl.stringAscii('approval-recorded'));
    
    // Check amendment approval
    const approval = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-amendment-approval',
      [
        Cl.uint(1),
        Cl.principal(wallet1)
      ],
      simnet.deployer
    );
    
    expect(approval.result).toBeSome();
  });

  it('should finalize amendment after sufficient approvals', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    const wallet2 = simnet.accounts.get('wallet_2')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(2), // AMENDMENT_UPDATE
        Cl.stringAscii('Updating contact information'),
        Cl.stringAscii('old-contact@email.com'),
        Cl.stringAscii('new-contact@email.com'),
        Cl.stringAscii('Contact change request')
      ],
      simnet.deployer
    );
    
    // First approval
    simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('First approval')
      ],
      wallet1
    );
    
    // Second approval (should finalize)
    const finalApprovalResult = simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('Second approval - finalizing')
      ],
      wallet2
    );
    
    expect(finalApprovalResult.result).toBeOk(Cl.stringAscii('approved-and-finalized'));
  });

  it('should allow rejecting amendments', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(1), // AMENDMENT_CORRECTION
        Cl.stringAscii('Questionable correction'),
        Cl.stringAscii('Original Data'),
        Cl.stringAscii('Questionable Data'),
        Cl.stringAscii('Not clear if needed')
      ],
      simnet.deployer
    );
    
    // Reject amendment
    const rejectResult = simnet.callPublicFn(
      'amendment-tracking',
      'reject-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('Not sufficient evidence for this change')
      ],
      wallet1
    );
    
    expect(rejectResult.result).toBeOk(Cl.stringAscii('rejection-recorded'));
  });

  it('should finalize rejection after sufficient rejections', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    const wallet2 = simnet.accounts.get('wallet_2')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(1), // AMENDMENT_CORRECTION
        Cl.stringAscii('Controversial change'),
        Cl.stringAscii('Original Data'),
        Cl.stringAscii('Controversial Data'),
        Cl.stringAscii('Disputed change')
      ],
      simnet.deployer
    );
    
    // First rejection
    simnet.callPublicFn(
      'amendment-tracking',
      'reject-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('First rejection')
      ],
      wallet1
    );
    
    // Second rejection (should finalize as rejected)
    const finalRejectionResult = simnet.callPublicFn(
      'amendment-tracking',
      'reject-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('Second rejection - finalizing')
      ],
      wallet2
    );
    
    expect(finalRejectionResult.result).toBeOk(Cl.stringAscii('rejected-and-finalized'));
  });

  it('should prevent double voting from same entity', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(1),
        Cl.stringAscii('Test amendment'),
        Cl.stringAscii('Old'),
        Cl.stringAscii('New'),
        Cl.stringAscii('Test')
      ],
      simnet.deployer
    );
    
    // First approval
    simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('First approval')
      ],
      wallet1
    );
    
    // Try to approve again
    const duplicateApprovalResult = simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('Duplicate approval attempt')
      ],
      wallet1
    );
    
    expect(duplicateApprovalResult.result).toBeErr(Cl.uint(409)); // ERR_AMENDMENT_ALREADY_APPROVED
  });

  it('should prevent voting on finalized amendments', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    const wallet2 = simnet.accounts.get('wallet_2')!;
    const wallet3 = simnet.accounts.get('wallet_3')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(1),
        Cl.stringAscii('Test amendment'),
        Cl.stringAscii('Old'),
        Cl.stringAscii('New'),
        Cl.stringAscii('Test')
      ],
      simnet.deployer
    );
    
    // Get enough approvals to finalize
    simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [Cl.uint(1), Cl.stringAscii('First approval')],
      wallet1
    );
    
    simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [Cl.uint(1), Cl.stringAscii('Second approval')],
      wallet2
    );
    
    // Try to approve already finalized amendment
    const lateApprovalResult = simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [
        Cl.uint(1),
        Cl.stringAscii('Late approval')
      ],
      wallet3
    );
    
    expect(lateApprovalResult.result).toBeErr(Cl.uint(409)); // ERR_AMENDMENT_ALREADY_APPROVED
  });

  it('should link certificates successfully', () => {
    const result = simnet.callPublicFn(
      'amendment-tracking',
      'link-certificates',
      [
        Cl.uint(1), // Birth certificate
        Cl.uint(2)  // Death certificate
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.bool(true));
    
    // Check links are bidirectional
    const links1 = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-linked-certificates',
      [Cl.uint(1)],
      simnet.deployer
    );
    
    expect(links1.result).toBeSome();
    
    const links2 = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-linked-certificates',
      [Cl.uint(2)],
      simnet.deployer
    );
    
    expect(links2.result).toBeSome();
  });

  it('should track amendment history for certificates', () => {
    const certificateId = 1;
    
    // Create multiple amendments for same certificate
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(certificateId),
        Cl.uint(1),
        Cl.stringAscii('First amendment'),
        Cl.stringAscii('Old1'),
        Cl.stringAscii('New1'),
        Cl.stringAscii('First change')
      ],
      simnet.deployer
    );
    
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(certificateId),
        Cl.uint(2),
        Cl.stringAscii('Second amendment'),
        Cl.stringAscii('Old2'),
        Cl.stringAscii('New2'),
        Cl.stringAscii('Second change')
      ],
      simnet.deployer
    );
    
    // Get amendment history
    const history = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-amendment-history',
      [Cl.uint(certificateId)],
      simnet.deployer
    );
    
    expect(history.result).toBeSome();
    
    // Get latest amendment
    const latest = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-latest-amendment',
      [Cl.uint(certificateId)],
      simnet.deployer
    );
    
    expect(latest.result).toBeSome();
  });

  it('should check if amendment needs more approvals', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Create amendment
    simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(1),
        Cl.stringAscii('Test amendment'),
        Cl.stringAscii('Old'),
        Cl.stringAscii('New'),
        Cl.stringAscii('Test')
      ],
      simnet.deployer
    );
    
    // Check needs more approvals (initially true)
    let needsMore = simnet.callReadOnlyFn(
      'amendment-tracking',
      'needs-more-approvals',
      [Cl.uint(1)],
      simnet.deployer
    );
    
    expect(needsMore.result).toBeBool(true);
    
    // Add one approval
    simnet.callPublicFn(
      'amendment-tracking',
      'approve-amendment',
      [Cl.uint(1), Cl.stringAscii('One approval')],
      wallet1
    );
    
    // Still needs more (1 out of 2 required)
    needsMore = simnet.callReadOnlyFn(
      'amendment-tracking',
      'needs-more-approvals',
      [Cl.uint(1)],
      simnet.deployer
    );
    
    expect(needsMore.result).toBeBool(true);
  });

  it('should reject invalid amendment types', () => {
    const result = simnet.callPublicFn(
      'amendment-tracking',
      'create-amendment',
      [
        Cl.uint(1),
        Cl.uint(99), // Invalid amendment type
        Cl.stringAscii('Invalid amendment'),
        Cl.stringAscii('Old'),
        Cl.stringAscii('New'),
        Cl.stringAscii('Invalid')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeErr(Cl.uint(400)); // ERR_INVALID_AMENDMENT_TYPE
  });

  it('should allow contract owner to set required approvals', () => {
    const setResult = simnet.callPublicFn(
      'amendment-tracking',
      'set-required-approvals',
      [Cl.uint(3)],
      simnet.deployer
    );
    
    expect(setResult.result).toBeOk(Cl.bool(true));
    
    // Verify the change
    const requiredApprovals = simnet.callReadOnlyFn(
      'amendment-tracking',
      'get-required-approvals',
      [],
      simnet.deployer
    );
    
    expect(requiredApprovals.result).toBeUint(3);
  });

  it('should prevent non-owner from setting required approvals', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    const setResult = simnet.callPublicFn(
      'amendment-tracking',
      'set-required-approvals',
      [Cl.uint(3)],
      wallet1 // Non-owner
    );
    
    expect(setResult.result).toBeErr(Cl.uint(401)); // ERR_UNAUTHORIZED
  });
});