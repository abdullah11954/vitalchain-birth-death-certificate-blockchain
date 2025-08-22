import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

describe('Access Control Contract', () => {
  it('should deploy successfully with owner as admin', () => {
    expect(simnet).toBeDefined();
    
    // Check if deployer is admin
    const isAdmin = simnet.callReadOnlyFn(
      'access-control',
      'is-admin',
      [Cl.principal(simnet.deployer)],
      simnet.deployer
    );
    
    expect(isAdmin.result).toBeBool(true);
    
    // Check admin count
    const adminCount = simnet.callReadOnlyFn(
      'access-control',
      'get-admin-count',
      [],
      simnet.deployer
    );
    
    expect(adminCount.result).toBeUint(1);
  });

  it('should allow admin to add authorized issuer', () => {
    const wallet1 = simnet.deployer; // Using deployer as test account for simplicity
    
    const result = simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.bool(true));
    
    // Verify entity was added as issuer
    const isIssuer = simnet.callReadOnlyFn(
      'access-control',
      'is-issuer',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    
    expect(isIssuer.result).toBeBool(true);
    
    // Check can issue certificates permission
    const canIssue = simnet.callReadOnlyFn(
      'access-control',
      'can-issue-certificates',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    
    expect(canIssue.result).toBeBool(true);
  });

  it('should allow admin to add verifier entity', () => {
    const wallet2 = simnet.accounts.get('wallet_2')!;
    
    const result = simnet.callPublicFn(
      'access-control',
      'add-verifier',
      [
        Cl.principal(wallet2),
        Cl.stringAscii('Legal Firm ABC'),
        Cl.stringAscii('info@legalfirm.com')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.bool(true));
    
    // Verify entity was added as verifier
    const isVerifier = simnet.callReadOnlyFn(
      'access-control',
      'is-verifier',
      [Cl.principal(wallet2)],
      simnet.deployer
    );
    
    expect(isVerifier.result).toBeBool(true);
    
    // Check can verify certificates permission
    const canVerify = simnet.callReadOnlyFn(
      'access-control',
      'can-verify-certificates',
      [Cl.principal(wallet2)],
      simnet.deployer
    );
    
    expect(canVerify.result).toBeBool(true);
    
    // Check cannot issue certificates
    const canIssue = simnet.callReadOnlyFn(
      'access-control',
      'can-issue-certificates',
      [Cl.principal(wallet2)],
      simnet.deployer
    );
    
    expect(canIssue.result).toBeBool(false);
  });

  it('should allow admin to add auditor entity', () => {
    const wallet3 = simnet.accounts.get('wallet_3')!;
    
    const result = simnet.callPublicFn(
      'access-control',
      'add-auditor',
      [
        Cl.principal(wallet3),
        Cl.stringAscii('Audit Company XYZ'),
        Cl.stringAscii('audit@company.com')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.bool(true));
    
    // Check audit trail permission
    const hasAuditPermission = simnet.callReadOnlyFn(
      'access-control',
      'has-permission',
      [
        Cl.principal(wallet3),
        Cl.stringAscii('view-audit-trail')
      ],
      simnet.deployer
    );
    
    expect(hasAuditPermission.result).toBeBool(true);
  });

  it('should prevent non-admin from adding entities', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    const wallet2 = simnet.accounts.get('wallet_2')!;
    
    const result = simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet2),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      wallet1 // Non-admin trying to add entity
    );
    
    expect(result.result).toBeErr(Cl.uint(401)); // ERR_UNAUTHORIZED
  });

  it('should prevent adding duplicate entity', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Add entity first time
    const result1 = simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      simnet.deployer
    );
    
    expect(result1.result).toBeOk(Cl.bool(true));
    
    // Try to add same entity again with different role
    const result2 = simnet.callPublicFn(
      'access-control',
      'add-verifier',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Legal Firm'),
        Cl.stringAscii('info@legal.com')
      ],
      simnet.deployer
    );
    
    expect(result2.result).toBeErr(Cl.uint(409)); // ERR_ALREADY_EXISTS
  });

  it('should allow admin to revoke entity access', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Add entity
    simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      simnet.deployer
    );
    
    // Verify entity is active
    let isIssuer = simnet.callReadOnlyFn(
      'access-control',
      'is-issuer',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    expect(isIssuer.result).toBeBool(true);
    
    // Revoke access
    const revokeResult = simnet.callPublicFn(
      'access-control',
      'revoke-access',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    
    expect(revokeResult.result).toBeOk(Cl.bool(true));
    
    // Verify entity is no longer active
    isIssuer = simnet.callReadOnlyFn(
      'access-control',
      'is-issuer',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    expect(isIssuer.result).toBeBool(false);
  });

  it('should allow admin to update entity role', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Add entity as issuer
    simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      simnet.deployer
    );
    
    // Verify is issuer
    let isIssuer = simnet.callReadOnlyFn(
      'access-control',
      'is-issuer',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    expect(isIssuer.result).toBeBool(true);
    
    // Update to verifier role (role = 3)
    const updateResult = simnet.callPublicFn(
      'access-control',
      'update-entity-role',
      [
        Cl.principal(wallet1),
        Cl.uint(3) // ROLE_VERIFIER
      ],
      simnet.deployer
    );
    
    expect(updateResult.result).toBeOk(Cl.bool(true));
    
    // Verify is now verifier, not issuer
    isIssuer = simnet.callReadOnlyFn(
      'access-control',
      'is-issuer',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    expect(isIssuer.result).toBeBool(false);
    
    const isVerifier = simnet.callReadOnlyFn(
      'access-control',
      'is-verifier',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    expect(isVerifier.result).toBeBool(true);
  });

  it('should prevent updating to invalid role', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Add entity
    simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      simnet.deployer
    );
    
    // Try to update to invalid role
    const updateResult = simnet.callPublicFn(
      'access-control',
      'update-entity-role',
      [
        Cl.principal(wallet1),
        Cl.uint(99) // Invalid role
      ],
      simnet.deployer
    );
    
    expect(updateResult.result).toBeErr(Cl.uint(400)); // ERR_INVALID_ROLE
  });

  it('should prevent admin from removing self if only admin', () => {
    // Try to revoke own access (deployer is the only admin)
    const revokeResult = simnet.callPublicFn(
      'access-control',
      'revoke-access',
      [Cl.principal(simnet.deployer)],
      simnet.deployer
    );
    
    expect(revokeResult.result).toBeErr(Cl.uint(403)); // ERR_CANNOT_REMOVE_SELF
  });

  it('should retrieve entity information', () => {
    const wallet1 = simnet.accounts.get('wallet_1')!;
    
    // Add entity
    simnet.callPublicFn(
      'access-control',
      'add-authorized-issuer',
      [
        Cl.principal(wallet1),
        Cl.stringAscii('Hospital General'),
        Cl.stringAscii('contact@hospital.com')
      ],
      simnet.deployer
    );
    
    // Get entity info
    const entityInfo = simnet.callReadOnlyFn(
      'access-control',
      'get-entity-info',
      [Cl.principal(wallet1)],
      simnet.deployer
    );
    
    expect(entityInfo.result).toBeSome();
  });

  it('should have correct role permissions', () => {
    // Check admin permissions (role 1)
    const adminPerms = simnet.callReadOnlyFn(
      'access-control',
      'get-role-permissions',
      [Cl.uint(1)],
      simnet.deployer
    );
    expect(adminPerms.result).toBeSome();
    
    // Check issuer permissions (role 2)
    const issuerPerms = simnet.callReadOnlyFn(
      'access-control',
      'get-role-permissions',
      [Cl.uint(2)],
      simnet.deployer
    );
    expect(issuerPerms.result).toBeSome();
    
    // Check verifier permissions (role 3)
    const verifierPerms = simnet.callReadOnlyFn(
      'access-control',
      'get-role-permissions',
      [Cl.uint(3)],
      simnet.deployer
    );
    expect(verifierPerms.result).toBeSome();
    
    // Check auditor permissions (role 4)
    const auditorPerms = simnet.callReadOnlyFn(
      'access-control',
      'get-role-permissions',
      [Cl.uint(4)],
      simnet.deployer
    );
    expect(auditorPerms.result).toBeSome();
  });
});