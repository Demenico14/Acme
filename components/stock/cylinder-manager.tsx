"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Cylinder } from "@/types" // Import the Cylinder type from types

// Define props interface for the component
interface CylinderManagerProps {
  cylinders: Cylinder[]
  onUpdate: (cylinders: Cylinder[]) => Promise<void>
}

const CylinderManager: React.FC<CylinderManagerProps> = ({ cylinders: initialCylinders, onUpdate }) => {
  const [cylinders, setCylinders] = useState<Cylinder[]>(initialCylinders || [])
  const [cylinderSize, setCylinderSize] = useState("")
  const [cylinderCount, setCylinderCount] = useState("")

  // Update local state when props change
  useEffect(() => {
    setCylinders(initialCylinders || [])
  }, [initialCylinders])

  const handleAddCylinder = () => {
    if (cylinderSize && cylinderCount) {
      const newCylinder: Cylinder = {
        id: `cylinder-${Date.now()}`,
        serialNumber: `SN-${Date.now()}`,
        capacity: Number(cylinderSize),
        manufacturer: "Default Manufacturer",
        manufactureDate: new Date().toISOString(),
        lastInspectionDate: new Date().toISOString(),
        nextInspectionDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        status: "available",
        location: "Main Storage",
        size: Number(cylinderSize),
        count: Number(cylinderCount),
        lastRestocked: new Date().toISOString(),
      }

      const updatedCylinders = [...cylinders, newCylinder]
      setCylinders(updatedCylinders)
      onUpdate(updatedCylinders)
      setCylinderSize("")
      setCylinderCount("")
    }
  }

  return (
    <div>
      <h2>Cylinder Manager</h2>
      <div>
        <label>Cylinder Size:</label>
        <input type="number" value={cylinderSize} onChange={(e) => setCylinderSize(e.target.value)} />
      </div>
      <div>
        <label>Cylinder Count:</label>
        <input type="number" value={cylinderCount} onChange={(e) => setCylinderCount(e.target.value)} />
      </div>
      <button onClick={handleAddCylinder}>Add Cylinder</button>

      <h3>Cylinders:</h3>
      <ul>
        {cylinders.map((cylinder) => (
          <li key={cylinder.id}>
            Size: {cylinder.size}, Count: {cylinder.count}, Serial Number: {cylinder.serialNumber}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CylinderManager

