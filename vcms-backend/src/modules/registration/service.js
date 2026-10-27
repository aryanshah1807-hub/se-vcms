// Registration Service (Member A - SRS 4.1)
import { tx } from '../../shared/db.js';
import { HttpError } from '../../shared/util.js';
import { ClientRepository, PatientRepository, AuditRepository } from './repositories.js';

export class RegistrationService {
  constructor(
    clientRepo = new ClientRepository(),
    patientRepo = new PatientRepository(),
    auditRepo = new AuditRepository()
  ) {
    this.clientRepo = clientRepo;
    this.patientRepo = patientRepo;
    this.auditRepo = auditRepo;
  }

  // REG-1, REG-2, REG-3
  async registerClientAndPet(dto, actor) {
    const { client, pet, confirmDuplicate } = dto;
    const existing = await this.clientRepo.findByPhoneOrEmail(client.phone, client.email);
    if (existing && !confirmDuplicate) {
      throw new HttpError(409, `A client with this phone or email already exists: ${existing.name}.`);
    }

    return await tx(actor, async (c) => {
      const createdClient = await this.clientRepo.create(c, client);
      const createdPet = await this.patientRepo.create(c, createdClient.client_id, pet);
      await this.auditRepo.record(c, { entityType: 'clients', entityId: createdClient.client_id, action: 'INSERT', newData: client, changedBy: actor?.id });
      await this.auditRepo.record(c, { entityType: 'patients', entityId: createdPet.patient_id, action: 'INSERT', newData: pet, changedBy: actor?.id });
      return { id: createdClient.client_id, petId: createdPet.patient_id };
    });
  }

  // REG-2
  async addPetToClient(clientId, petDto, actor) {
    const client = await this.clientRepo.findById(clientId);
    if (!client || client.status !== 'active') {
      throw new HttpError(404, 'Client not found or is inactive.');
    }
    return await tx(actor, async (c) => {
      const p = await this.patientRepo.create(c, clientId, petDto);
      await this.auditRepo.record(c, { entityType: 'patients', entityId: p.patient_id, action: 'INSERT', newData: petDto, changedBy: actor?.id });
      return p;
    });
  }

  // REG-5: Pet Owner self-service
  async updateClientContact(clientId, dto, actor) {
    await this.clientRepo.update(clientId, dto);
  }

  // REG-6: Soft-deactivation
  async deactivateClient(clientId, actor) {
    await tx(actor, async (c) => {
      const ok = await this.clientRepo.deactivate(c, clientId);
      if (!ok) throw new HttpError(404, 'Client not found.');
      await this.auditRepo.record(c, { entityType: 'clients', entityId: clientId, action: 'UPDATE', newData: { status: 'inactive' }, changedBy: actor?.id });
    });
  }

  // REG-4: Merge duplicate clients
  async mergeDuplicateClients(keepId, dropId, actor) {
    if (keepId === dropId) {
      throw new HttpError(400, 'Choose two different clients.');
    }
    const keep = await this.clientRepo.findById(keepId);
    const drop = await this.clientRepo.findById(dropId);
    if (!keep || !drop) {
      throw new HttpError(404, 'One or both client records not found.');
    }

    await tx(actor, async (c) => {
      await this.clientRepo.mergeClients(c, keepId, dropId);
      await this.auditRepo.record(c, { entityType: 'clients', entityId: keepId, action: 'MERGE', oldData: { droppedId: dropId }, newData: { keptId: keepId }, changedBy: actor?.id });
    });
  }

  async listClients() {
    return await this.clientRepo.findAllActive();
  }

  async listPatients(actor) {
    const own = actor?.role === 'Pet Owner';
    return await this.patientRepo.findAllActive(own ? actor.clientId : null);
  }

  async getAuditHistory() {
    return await this.auditRepo.getRecentAuditLogs(200);
  }
}

export const registrationService = new RegistrationService();
