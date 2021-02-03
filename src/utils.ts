
/**
 * @param interval postgres string interval HH:MM:SS
 * @returns seconds
 */
export const parsePGInterval = (interval: string) => interval.split(':').reduce((acc,time) => (60 * acc) + parseInt(time), 0)
