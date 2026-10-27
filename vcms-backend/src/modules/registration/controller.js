// Registration Controller (Member A)
import { z } from 'zod';
import { registrationService } from './service.js';

const petSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  sex: z.enum(['M','F']).optional(),
  dob: z.string().optional(),
  microchip: z.string().optional()
});

const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().or(z.literal('')).optional(),
  address: z.string().optional()
});

export class RegistrationController {
  constructor(service = registrationService) {
    this.service = service;
  }

  // REG-1, REG-2, REG-3
  register = async (req, res) => {
    const body = z.object({
      client: clientSchema,
      pet: petSchema,
      confirmDuplicate: z.boolean().optional()
    }).parse(req.body);

    const result = await this.service.registerClientAndPet(body, req.user);
    res.status(201).json(result);
  };

  // REG-2
  addPet = async (req, res) => {
    const pet = petSchema.parse(req.body);
    const result = await this.service.addPetToClient(+req.params.id, pet, req.user);
    res.status(201).json({ ok: true, petId: result.patient_id });
  };

  // REG-5: Pet Owner Profile
  getProfile = async (req, res) => {
    const client = await this.service.clientRepo.findById(req.user.clientId);
    const pets = await this.service.patientRepo.findByClientId(req.user.clientId);
    res.json({ ...client, pets });
  };

  // REG-2: Pet Owner adds own pet
  addMyPet = async (req, res) => {
    const pet = petSchema.parse(req.body);
    const result = await this.service.addPetToClient(req.user.clientId, pet, req.user);
    res.status(201).json({ ok: true, petId: result.patient_id });
  };

  // REG-5
  updateProfile = async (req, res) => {
    const body = clientSchema.partial().parse(req.body);
    await this.service.updateClientContact(req.user.clientId, body, req.user);
    res.json({ ok: true });
  };

  // REG-6
  deactivate = async (req, res) => {
    await this.service.deactivateClient(+req.params.id, req.user);
    res.json({ ok: true });
  };

  // REG-4
  merge = async (req, res) => {
    const { keepId, dropId } = z.object({
      keepId: z.number(),
      dropId: z.number()
    }).parse(req.body);
    await this.service.mergeDuplicateClients(keepId, dropId, req.user);
    res.json({ ok: true });
  };

  getClients = async (req, res) => {
    const clients = await this.service.listClients();
    res.json(clients);
  };

  getPatients = async (req, res) => {
    const patients = await this.service.listPatients(req.user);
    res.json(patients);
  };

  getAuditTrail = async (req, res) => {
    const audit = await this.service.getAuditHistory();
    res.json(audit);
  };
}

export const registrationController = new RegistrationController();
