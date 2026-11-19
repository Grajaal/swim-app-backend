
import { PrismaClient, Role, Team, Swimmer } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// ==========================================
// DEMO CONFIGURATION
// ==========================================

const COACHES = 3
const SWIMMERS_PER_COACH = 6
const GROUPS_PER_TEAM = 2

const FORM_PAST_MONTHS = 3
const FORM_FUTURE_MONTHS = 12
const FORM_PROBABILITY = 0.7

const TRAINING_PAST_MONTHS = 3
const TRAINING_FUTURE_MONTHS = 12

// Tuesday and Thursday
const TRAINING_DAYS = [2, 4]
const TRAINING_PROBABILITY = 0.85

// Public demo credentials
const DEMO_EMAIL = 'demo@demo.com'
const DEMO_PASSWORD = '12345678'

// Other fictional accounts
const OTHER_PASSWORD = 'asdf;lkj'

faker.seed(2026)

// ==========================================
// DATE HELPERS
// ==========================================

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getDateRange() {
  const today = startOfDay(new Date())

  const trainingStart = new Date(today)
  trainingStart.setMonth(
    trainingStart.getMonth() - TRAINING_PAST_MONTHS
  )

  const trainingEnd = new Date(today)
  trainingEnd.setMonth(
    trainingEnd.getMonth() + TRAINING_FUTURE_MONTHS
  )

  const formStart = new Date(today)
  formStart.setMonth(
    formStart.getMonth() - FORM_PAST_MONTHS
  )

  const formEnd = new Date(today)
  formEnd.setMonth(
    formEnd.getMonth() + FORM_FUTURE_MONTHS
  )

  return {
    today,
    trainingStart,
    trainingEnd,
    formStart,
    formEnd
  }
}

function generateTeamCode(index: number): string {
  return `DEM${String(index).padStart(3, '0')}`
}

// ==========================================
// MAIN SEED
// ==========================================

async function main() {
  console.log('Starting portfolio demo seed...')

  // SAFETY:
  // This script does not delete existing data.
  // It must run against an empty demo database.

  const existingUsers = await prisma.user.count()

  if (existingUsers > 0) {
    throw new Error(
      'Database already contains users. ' +
      'Run this seed against an empty demo database. ' +
      'No existing data has been deleted.'
    )
  }

  const {
    today,
    trainingStart,
    trainingEnd,
    formStart,
    formEnd
  } = getDateRange()

  console.log(`Today: ${today.toDateString()}`)

  console.log(
    `Forms: ${formStart.toDateString()} to ${formEnd.toDateString()}`
  )

  console.log(
    `Trainings: ${trainingStart.toDateString()} to ${trainingEnd.toDateString()}`
  )

  // Hash passwords once
  const demoHashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10)
  const otherHashedPassword = await bcrypt.hash(OTHER_PASSWORD, 10)

  const teams: Team[] = []
  const swimmers: Swimmer[] = []

  let formCount = 0
  let groupTrainingCount = 0
  let individualTrainingCount = 0

  // ========================================
  // 1. CREATE COACHES AND TEAMS
  // ========================================

  console.log('Creating coaches and teams...')

  for (let i = 0; i < COACHES; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    // First coach is the public demo account
    const email =
      i === 0
        ? DEMO_EMAIL
        : `demo.coach${i + 1}@example.com`

    const password =
      i === 0
        ? demoHashedPassword
        : otherHashedPassword

    const coachUser = await prisma.user.create({
      data: {
        email,
        password,
        role: Role.COACH
      }
    })

    const coach = await prisma.coach.create({
      data: {
        id: coachUser.id,
        firstName,
        lastName
      }
    })

    const team = await prisma.team.create({
      data: {
        coachId: coach.id,
        teamCode: generateTeamCode(i + 1)
      }
    })

    teams.push(team)

    console.log(`Coach created: ${email}`)
  }

  // ========================================
  // 2. CREATE SWIMMERS
  // ========================================

  console.log('Creating swimmers...')

  let swimmerIndex = 1

  for (const team of teams) {
    for (let i = 0; i < SWIMMERS_PER_COACH; i++) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()

      const email = `demo.swimmer${swimmerIndex}@example.com`

      const swimmerUser = await prisma.user.create({
        data: {
          email,
          password: otherHashedPassword,
          role: Role.SWIMMER
        }
      })

      const swimmer = await prisma.swimmer.create({
        data: {
          id: swimmerUser.id,
          firstName,
          lastName,
          teamId: team.id
        }
      })

      swimmers.push(swimmer)

      swimmerIndex++
    }
  }

  console.log(`${swimmers.length} swimmers created`)

  // ========================================
  // 3. CREATE DAILY FORMS
  // ========================================

  console.log('Creating daily forms...')

  for (const swimmer of swimmers) {
    const forms: {
      swimmerId: string
      date: Date
      sleepHours: number
      sleepQuality: number
      musclePain: number
      fatigue: number
      stress: number
    }[] = []

    for (
      let date = new Date(formStart);
      date <= formEnd;
      date = addDays(date, 1)
    ) {
      if (Math.random() >= FORM_PROBABILITY) {
        continue
      }

      forms.push({
        swimmerId: swimmer.id,
        date: new Date(date),
        sleepHours: faker.number.int({
          min: 5,
          max: 9
        }),
        sleepQuality: faker.number.int({
          min: 4,
          max: 10
        }),
        musclePain: faker.number.int({
          min: 1,
          max: 8
        }),
        fatigue: faker.number.int({
          min: 1,
          max: 8
        }),
        stress: faker.number.int({
          min: 1,
          max: 8
        })
      })
    }

    if (forms.length > 0) {
      const result = await prisma.dailyForm.createMany({
        data: forms
      })

      formCount += result.count
    }
  }

  console.log(`${formCount} daily forms created`)

  // ========================================
  // 4. CREATE GROUPS
  // ========================================

  console.log('Creating training groups...')

  const allGroups: {
    id: string
    swimmerIds: string[]
  }[] = []

  for (const team of teams) {
    const teamSwimmers = swimmers.filter(
      (swimmer) => swimmer.teamId === team.id
    )

    const shuffled = faker.helpers.shuffle([...teamSwimmers])

    for (let i = 0; i < GROUPS_PER_TEAM; i++) {
      const groupSwimmers = shuffled.filter(
        (_, index) => index % GROUPS_PER_TEAM === i
      )

      const group = await prisma.group.create({
        data: {
          name: `Group ${i + 1}`,
          teamId: team.id,
          swimmers: {
            connect: groupSwimmers.map((swimmer) => ({
              id: swimmer.id
            }))
          }
        }
      })

      allGroups.push({
        id: group.id,
        swimmerIds: groupSwimmers.map((swimmer) => swimmer.id)
      })
    }
  }

  console.log(`${allGroups.length} groups created`)

  // ========================================
  // 5. CREATE GROUP TRAININGS
  // ========================================

  console.log('Creating past and future group trainings...')

  for (const group of allGroups) {
    let currentDate = new Date(trainingStart)

    while (currentDate <= trainingEnd) {
      const dayOfWeek = currentDate.getDay()

      if (
        TRAINING_DAYS.includes(dayOfWeek) &&
        Math.random() < TRAINING_PROBABILITY
      ) {
        const trainingDate = new Date(currentDate)

        trainingDate.setHours(
          faker.helpers.arrayElement([8, 10, 17, 18, 19]),
          faker.helpers.arrayElement([0, 15, 30]),
          0,
          0
        )

        const trainingMinutes = faker.number.int({
          min: 60,
          max: 120
        })

        const trainingMeters = faker.number.int({
          min: 2000,
          max: 5000
        })

        await prisma.training.create({
          data: {
            date: trainingDate,
            minutes: trainingMinutes,
            meters: trainingMeters,
            description: faker.helpers.arrayElement([
              'Aerobic endurance training',
              'Technique and drills',
              'Speed and sprint work',
              'Recovery session',
              'Threshold training',
              'Mixed swimming session'
            ]),
            groupId: group.id,
            swimmers: {
              connect: group.swimmerIds.map((id) => ({
                id
              }))
            }
          }
        })

        groupTrainingCount++
      }

      currentDate = addDays(currentDate, 1)
    }
  }

  console.log(`${groupTrainingCount} group trainings created`)

  // ========================================
  // 6. CREATE INDIVIDUAL TRAININGS
  // ========================================

  console.log('Creating individual trainings...')

  for (const swimmer of swimmers) {
    if (Math.random() >= 0.4) {
      continue
    }

    const swimmerGroup = allGroups.find(
      (group) => group.swimmerIds.includes(swimmer.id)
    )

    const trainingDate = faker.date.between({
      from: formStart,
      to: today
    })

    await prisma.training.create({
      data: {
        date: trainingDate,
        minutes: faker.number.int({
          min: 30,
          max: 90
        }),
        meters: faker.number.int({
          min: 800,
          max: 3000
        }),
        description: 'Individual training session',
        groupId: swimmerGroup?.id ?? null,
        swimmers: {
          connect: {
            id: swimmer.id
          }
        }
      }
    })

    individualTrainingCount++
  }

  // ========================================
  // 7. FINAL SUMMARY
  // ========================================

  console.log('')
  console.log('======================================')
  console.log('DEMO SEED COMPLETED SUCCESSFULLY')
  console.log('======================================')
  console.log(`Coaches: ${COACHES}`)
  console.log(`Teams: ${teams.length}`)
  console.log(`Swimmers: ${swimmers.length}`)
  console.log(`Groups: ${allGroups.length}`)
  console.log(`Daily forms: ${formCount}`)
  console.log(`Group trainings: ${groupTrainingCount}`)
  console.log(`Individual trainings: ${individualTrainingCount}`)
  console.log('======================================')
  console.log('')
  console.log('PUBLIC DEMO CREDENTIALS')
  console.log(`Email: ${DEMO_EMAIL}`)
  console.log(`Password: ${DEMO_PASSWORD}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Seed failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
