import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

describe('Certificate Registry Contract', () => {
  it('should deploy and issue birth certificate successfully', () => {
    const result = simnet.callPublicFn(
      'certificate-registry',
      'issue-birth-certificate',
      [
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('ID123456789'),
        Cl.uint(20000101),
        Cl.stringAscii('New York City'),
        Cl.stringAscii('Father: Mike Smith, Mother: Jane Smith'),
        Cl.bufferFromHex('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.uint(1));
  });

  it('should issue death certificate successfully', () => {
    const result = simnet.callPublicFn(
      'certificate-registry',
      'issue-death-certificate',
      [
        Cl.stringAscii('Jane Doe'),
        Cl.stringAscii('ID987654321'),
        Cl.uint(19500615),
        Cl.uint(20240101),
        Cl.stringAscii('Hospital General'),
        Cl.bufferFromHex('0202030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20')
      ],
      simnet.deployer
    );
    
    expect(result.result).toBeOk(Cl.uint(1));
  });

  it('should verify certificate authenticity', () => {
    const documentHash = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
    
    // Issue certificate
    simnet.callPublicFn(
      'certificate-registry',
      'issue-birth-certificate',
      [
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('ID123456789'),
        Cl.uint(20000101),
        Cl.stringAscii('New York City'),
        Cl.stringAscii('Father: Mike Smith, Mother: Jane Smith'),
        Cl.bufferFromHex(documentHash)
      ],
      simnet.deployer
    );
    
    // Verify with correct hash
    const verifyResult = simnet.callPublicFn(
      'certificate-registry',
      'verify-certificate',
      [
        Cl.uint(1),
        Cl.bufferFromHex(documentHash)
      ],
      simnet.deployer
    );
    
    expect(verifyResult.result).toBeOk(Cl.bool(true));
  });

  it('should prevent duplicate birth certificates', () => {
    // Issue first certificate
    const result1 = simnet.callPublicFn(
      'certificate-registry',
      'issue-birth-certificate',
      [
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('ID123456789'),
        Cl.uint(20000101),
        Cl.stringAscii('New York City'),
        Cl.stringAscii('Father: Mike Smith, Mother: Jane Smith'),
        Cl.bufferFromHex('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20')
      ],
      simnet.deployer
    );
    
    expect(result1.result).toBeOk(Cl.uint(1));
    
    // Try to issue duplicate - should fail
    const result2 = simnet.callPublicFn(
      'certificate-registry',
      'issue-birth-certificate',
      [
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('ID123456789'),
        Cl.uint(20000101),
        Cl.stringAscii('New York City'),
        Cl.stringAscii('Father: Mike Smith, Mother: Jane Smith'),
        Cl.bufferFromHex('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20')
      ],
      simnet.deployer
    );
    
    expect(result2.result).toBeErr(Cl.uint(409));
  });

  it('should retrieve certificate data', () => {
    // Issue certificate
    simnet.callPublicFn(
      'certificate-registry',
      'issue-birth-certificate',
      [
        Cl.stringAscii('John Smith'),
        Cl.stringAscii('ID123456789'),
        Cl.uint(20000101),
        Cl.stringAscii('New York City'),
        Cl.stringAscii('Father: Mike Smith, Mother: Jane Smith'),
        Cl.bufferFromHex('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20')
      ],
      simnet.deployer
    );
    
    // Get certificate
    const certificate = simnet.callReadOnlyFn(
      'certificate-registry',
      'get-certificate',
      [Cl.uint(1)],
      simnet.deployer
    );
    
    // Verify certificate data exists
    expect(certificate.result).toBeTruthy();
    
    // Get counter
    const counter = simnet.callReadOnlyFn(
      'certificate-registry',
      'get-certificate-counter',
      [],
      simnet.deployer
    );
    
    expect(counter.result).toBeUint(1);
  });
});