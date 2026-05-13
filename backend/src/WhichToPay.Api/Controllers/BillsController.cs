using Microsoft.AspNetCore.Mvc;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Dtos;
using WhichToPay.Core.Persistence;
using WhichToPay.Core.Validation;

namespace WhichToPay.Api.Controllers;

[ApiController]
[Route("api/bills")]
public sealed class BillsController : ControllerBase
{
    private readonly IBillRepository _repo;

    public BillsController(IBillRepository repo) => _repo = repo;

    [HttpGet]
    public ActionResult<IEnumerable<BillReadDto>> GetAll() =>
        Ok(_repo.GetAll().Select(BillReadDto.From));

    [HttpGet("{id:guid}")]
    public ActionResult<BillReadDto> GetById(Guid id)
    {
        var bill = _repo.GetById(id);
        return bill is null ? NotFound() : Ok(BillReadDto.From(bill));
    }

    [HttpPost]
    public ActionResult<BillReadDto> Create(BillCreateDto dto)
    {
        var (ok, reason) = InputSanitizer.Check(dto.Name);
        if (!ok) return BadRequest(new { error = reason });

        var bill = new Bill
        {
            Name = dto.Name.Trim(),
            MonthlyAmountOwed = dto.MonthlyAmountOwed,
            TotalBalance = dto.TotalBalance,
            DueDate = dto.DueDate,
            Category = dto.Category,
            MinimumPayment = dto.MinimumPayment
        };
        _repo.Add(bill);
        return CreatedAtAction(nameof(GetById), new { id = bill.Id }, BillReadDto.From(bill));
    }

    [HttpPut("{id:guid}")]
    public ActionResult<BillReadDto> Update(Guid id, BillUpdateDto dto)
    {
        var (ok, reason) = InputSanitizer.Check(dto.Name);
        if (!ok) return BadRequest(new { error = reason });

        var existing = _repo.GetById(id);
        if (existing is null) return NotFound();

        existing.Name = dto.Name.Trim();
        existing.MonthlyAmountOwed = dto.MonthlyAmountOwed;
        existing.TotalBalance = dto.TotalBalance;
        existing.DueDate = dto.DueDate;
        existing.Category = dto.Category;
        existing.MinimumPayment = dto.MinimumPayment;

        _repo.Update(existing);
        return Ok(BillReadDto.From(existing));
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id) =>
        _repo.Delete(id) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/mark-paid")]
    public ActionResult<BillReadDto> MarkPaid(Guid id, MarkPaidDto dto)
    {
        var existing = _repo.GetById(id);
        if (existing is null) return NotFound();

        existing.LastPaidPeriod = dto.PaidPeriod;
        existing.LastPaidAt = DateTime.UtcNow;
        _repo.Update(existing);
        return Ok(BillReadDto.From(existing));
    }
}
